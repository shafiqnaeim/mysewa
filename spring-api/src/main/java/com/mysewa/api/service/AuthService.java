package com.mysewa.api.service;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.web.auth.ForgotPasswordRequest;
import com.mysewa.api.web.auth.LoginRequest;
import com.mysewa.api.web.auth.RegisterRequest;
import com.mysewa.api.web.auth.ProfileUpdateRequest;
import com.mysewa.api.web.auth.ResetPasswordRequest;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final EmailService emailService;
    private final IcCryptoService icCryptoService;
    private final JwtService jwtService;

    /** Canonical admin mailbox from bootstrap; login also accepts the alias {@code admin}. */
    @Value("${app.admin.email:}")
    private String configuredAdminEmail;

    @Value("${app.demo.student.email:student@demo.mysewa}")
    private String demoStudentEmail;

    @Value("${app.demo.landlord.email:landlord@demo.mysewa}")
    private String demoLandlordEmail;

    @Value("${app.auth.base-url:http://localhost:5173}")
    private String frontendBaseUrl;
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+60\\d{2}-\\d{7,8}$");
    private static final Pattern IC_PATTERN = Pattern.compile("^\\d{6}-\\d{2}-\\d{4}$");
    private static final Set<String> SELF_SERVE_ROLES = Set.of("student", "landlord", "admin");
    private static final Set<String> REGISTER_ROLES = Set.of("student", "landlord");

    public AuthService(
            UserAccountRepository userAccountRepository,
            EmailService emailService,
            IcCryptoService icCryptoService,
            JwtService jwtService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.emailService = emailService;
        this.icCryptoService = icCryptoService;
        this.jwtService = jwtService;
    }

    public UserAccount register(RegisterRequest request) {
        validateRegisterRequest(request);

        String email = request.email.trim().toLowerCase();
        if (userAccountRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPassword(BCrypt.hashpw(request.password, BCrypt.gensalt(10)));
        user.setFullName(request.fullName.trim());
        user.setPhoneNumber(request.phoneNumber.trim());
        user.setIcNumber(icCryptoService.encryptForStorage(request.icNumber.trim()));
        user.setUniversity(request.university.trim());
        user.setUniversityId(request.universityId);
        user.setRace(blankToNull(request.race));
        user.setReligion(blankToNull(request.religion));
        String roleNorm = blankToDefault(request.role, "student").toLowerCase(Locale.ROOT);
        if (!REGISTER_ROLES.contains(roleNorm)) {
            throw new IllegalArgumentException("Invalid role — only Student or Landlord can register.");
        }
        user.setRole(roleNorm);
        user.setVerified(false);
        user.setAccountStatus("active");
        user.setDocumentVerificationStatus("not_submitted");
        user.setEmailVerificationToken(UUID.randomUUID().toString());
        UserAccount saved = userAccountRepository.save(user);

        String verificationLink = frontendBaseUrl + "/verify-email?token=" + saved.getEmailVerificationToken();
        emailService.sendVerificationEmail(saved.getEmail(), saved.getFullName(), verificationLink);

        return saved;
    }

    public UserAccount login(LoginRequest request) {
        if (request == null || isBlank(request.email) || isBlank(request.password)) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String lookupEmail = resolveLoginEmail(request.email);

        UserAccount user = userAccountRepository.findByEmailIgnoreCase(lookupEmail)
                .orElseThrow(() -> new IllegalArgumentException("Wrong email."));

        if (!BCrypt.checkpw(request.password, user.getPassword())) {
            throw new IllegalArgumentException("Wrong password.");
        }

        if (!user.isVerified()) {
            throw new IllegalArgumentException("Please verify your email before signing in.");
        }

        if (user.getAccountStatus() != null && !"active".equalsIgnoreCase(user.getAccountStatus())) {
            throw new IllegalArgumentException("This account has been suspended. Contact support if you believe this is an error.");
        }

        return user;
    }

    public UserAccount me(String bearerToken) {
        String token = extractToken(bearerToken);
        Integer userId;
        try {
            userId = jwtService.parseUserId(token);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    /**
     * Updates editable profile fields for the signed-in student, landlord, or admin. Email, password, role, and IC are unchanged.
     */
    public UserAccount updateProfile(String authorization, ProfileUpdateRequest request) {
        UserAccount u = me(authorization);
        String role = u.getRole() != null ? u.getRole().toLowerCase(Locale.ROOT) : "";
        if (!SELF_SERVE_ROLES.contains(role)) {
            throw new IllegalArgumentException("Profile update is only available for student, landlord, and admin accounts.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        String fn = request.fullName == null ? "" : request.fullName.trim();
        if (fn.isEmpty()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (fn.length() > 255) {
            throw new IllegalArgumentException("Full name is too long");
        }
        u.setFullName(fn);

        if (request.phoneNumber != null && !request.phoneNumber.trim().isEmpty()) {
            String p = request.phoneNumber.trim();
            if (!PHONE_PATTERN.matcher(p).matches()) {
                throw new IllegalArgumentException("Phone Number must follow format +60xx-xxxxxxx");
            }
            u.setPhoneNumber(p);
        }

        if (request.country != null) {
            String c = blankToNull(request.country);
            if (c != null && c.length() > 100) {
                c = c.substring(0, 100);
            }
            u.setCountry(c);
        }

        if ("student".equals(role)) {
            u.setProgramStudy(blankToNull(request.programStudy));
            String ay = blankToNull(request.academicYear);
            if (ay != null && ay.length() > 32) {
                ay = ay.substring(0, 32);
            }
            u.setAcademicYear(ay);
        }

        u.setUpdatedAt(LocalDateTime.now());
        return userAccountRepository.save(u);
    }

    public String generateToken(Integer userId) {
        return jwtService.generateToken(userId);
    }

    public void verifyEmail(String token) {
        if (isBlank(token)) {
            throw new IllegalArgumentException("Verification token is required");
        }
        UserAccount user = userAccountRepository.findByEmailVerificationToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token"));
        user.setVerified(true);
        user.setEmailVerificationToken(null);
        userAccountRepository.save(user);
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        if (request == null || isBlank(request.email)) {
            throw new IllegalArgumentException("Email is required");
        }
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(request.email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("No account found with this email address."));
        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(30));
        userAccountRepository.save(user);

        String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink);
    }

    public void resendVerificationEmail(ForgotPasswordRequest request) {
        if (request == null || isBlank(request.email)) {
            throw new IllegalArgumentException("Email is required");
        }
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(request.email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.isVerified()) {
            throw new IllegalArgumentException("Email is already verified");
        }
        String token = UUID.randomUUID().toString();
        user.setEmailVerificationToken(token);
        userAccountRepository.save(user);
        String verificationLink = frontendBaseUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), verificationLink);
    }

    public void resetPassword(ResetPasswordRequest request) {
        if (request == null || isBlank(request.token) || isBlank(request.newPassword) || isBlank(request.confirmPassword)) {
            throw new IllegalArgumentException("Missing required fields");
        }
        if (!request.newPassword.equals(request.confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        UserAccount user = userAccountRepository.findByPasswordResetToken(request.token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));

        if (user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset token has expired");
        }

        user.setPassword(BCrypt.hashpw(request.newPassword, BCrypt.gensalt(10)));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        userAccountRepository.save(user);
    }

    private void validateRegisterRequest(RegisterRequest request) {
        if (request == null
                || isBlank(request.email)
                || isBlank(request.password)
                || isBlank(request.confirmPassword)
                || isBlank(request.fullName)
                || isBlank(request.phoneNumber)
                || isBlank(request.icNumber)
                || isBlank(request.university)) {
            throw new IllegalArgumentException("Missing required fields");
        }

        if (!request.password.equals(request.confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String normalizedPhone = request.phoneNumber.trim();
        if (!PHONE_PATTERN.matcher(normalizedPhone).matches()) {
            throw new IllegalArgumentException("Phone Number must follow format +60xx-xxxxxxx");
        }

        String normalizedIc = request.icNumber.trim();
        if (!IC_PATTERN.matcher(normalizedIc).matches()) {
            throw new IllegalArgumentException("IC Number must follow format 123456-78-9010");
        }
    }

    /** Maps login-page demo usernames and admin alias to canonical mailbox. */
    private String resolveLoginEmail(String rawLogin) {
        if (isBlank(rawLogin)) {
            return "";
        }
        String login = rawLogin.trim();
        if ("admin".equalsIgnoreCase(login) && configuredAdminEmail != null && !configuredAdminEmail.trim().isEmpty()) {
            return configuredAdminEmail.trim().toLowerCase();
        }
        if ("student".equalsIgnoreCase(login) && demoStudentEmail != null && !demoStudentEmail.trim().isEmpty()) {
            return demoStudentEmail.trim().toLowerCase();
        }
        if ("landlord".equalsIgnoreCase(login) && demoLandlordEmail != null && !demoLandlordEmail.trim().isEmpty()) {
            return demoLandlordEmail.trim().toLowerCase();
        }
        return login.toLowerCase();
    }

    private String extractToken(String bearerToken) {
        if (isBlank(bearerToken) || !bearerToken.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing bearer token");
        }
        return bearerToken.substring("Bearer ".length()).trim();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static String blankToDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
