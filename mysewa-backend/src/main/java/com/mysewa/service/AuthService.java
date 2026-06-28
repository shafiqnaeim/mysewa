package com.mysewa.service;

import com.mysewa.config.JwtService;
import com.mysewa.dto.request.AuthRequest;
import com.mysewa.dto.request.RegisterRequest;
import com.mysewa.dto.response.AuthResponse;
import com.mysewa.dto.response.UserResponse;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.User;
import com.mysewa.repository.UserRepository;
import com.mysewa.util.SecurityUtil;
import com.mysewa.util.ValidationUtil;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Set<Role> REGISTER_ROLES = Set.of(Role.STUDENT, Role.LANDLORD);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.admin.email:}")
    private String configuredAdminEmail;

    @Value("${app.auth.auto-verify:false}")
    private boolean autoVerify;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }
        Role role = Role.fromString(request.getRole());
        if (!REGISTER_ROLES.contains(role)) {
            throw new BadRequestException("Invalid role — only Student or Landlord can register");
        }
        String phone = ValidationUtil.normalizePhoneInput(request.getPhoneNumber());
        ValidationUtil.requirePhone(phone);
        ValidationUtil.requireIc(request.getIcNumber());

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new BadRequestException("Email already registered");
        }

        String university = role == Role.LANDLORD ? "None" : request.getUniversity().trim();
        if (role == Role.STUDENT && university.isBlank()) {
            throw new BadRequestException("University is required for students");
        }

        LocalDateTime now = LocalDateTime.now();
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phoneNumber(phone)
                .icNumber(request.getIcNumber().trim())
                .university(university)
                .universityId(request.getUniversityId())
                .race(trimOrNull(request.getRace()))
                .religion(trimOrNull(request.getReligion()))
                .role(role)
                .verified(autoVerify)
                .accountStatus("active")
                .documentVerificationStatus("not_submitted")
                .emailVerificationToken(UUID.randomUUID().toString())
                .createdAt(now)
                .updatedAt(now)
                .build();
        userRepository.save(user);
    }

    public AuthResponse login(AuthRequest request) {
        String rawLogin = request.getEmail().trim();
        String lookupEmail = rawLogin;
        if ("admin".equalsIgnoreCase(rawLogin) && configuredAdminEmail != null && !configuredAdminEmail.isBlank()) {
            lookupEmail = configuredAdminEmail.trim();
        }

        User user = userRepository.findByEmailIgnoreCase(lookupEmail)
                .orElseThrow(() -> new UnauthorizedException("Wrong email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Wrong email or password");
        }
        if (!user.isVerified()) {
            throw new BadRequestException("Please verify your email before signing in");
        }
        if (user.getAccountStatus() != null && !"active".equalsIgnoreCase(user.getAccountStatus())) {
            throw new BadRequestException("This account has been suspended");
        }

        String token = jwtService.generateToken(user.getId());
        return AuthResponse.of("Login successful", token, user);
    }

    public UserResponse me() {
        return UserResponse.from(SecurityUtil.currentUser());
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
