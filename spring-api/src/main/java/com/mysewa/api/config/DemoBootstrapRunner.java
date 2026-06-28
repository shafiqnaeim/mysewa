package com.mysewa.api.config;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.IcCryptoService;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ensures demo student/landlord accounts exist for the login page credential table.
 * Sign-in aliases: {@code Student}, {@code Landlord} (see {@link com.mysewa.api.service.AuthService}).
 */
@Component
@Order(20)
public class DemoBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoBootstrapRunner.class);

    private final UserAccountRepository userAccountRepository;
    private final IcCryptoService icCryptoService;

    @Value("${app.demo.enabled:true}")
    private boolean enabled;

    @Value("${app.demo.student.email:student@demo.mysewa}")
    private String studentEmail;

    @Value("${app.demo.student.password:Student123}")
    private String studentPassword;

    @Value("${app.demo.landlord.email:landlord@demo.mysewa}")
    private String landlordEmail;

    @Value("${app.demo.landlord.password:Landlord123}")
    private String landlordPassword;

    public DemoBootstrapRunner(UserAccountRepository userAccountRepository, IcCryptoService icCryptoService) {
        this.userAccountRepository = userAccountRepository;
        this.icCryptoService = icCryptoService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Demo account bootstrap skipped (app.demo.enabled=false).");
            return;
        }
        reconcileDemoUser(
                studentEmail,
                studentPassword,
                "student",
                "Demo Student",
                "+6012-1111111",
                "010101-01-0101",
                "UMT",
                "Malay",
                "Islam"
        );
        reconcileDemoUser(
                landlordEmail,
                landlordPassword,
                "landlord",
                "Demo Landlord",
                "+6012-2222222",
                "020202-02-0202",
                "None",
                "Malay",
                "Islam"
        );
    }

    private void reconcileDemoUser(
            String email,
            String password,
            String role,
            String fullName,
            String phone,
            String icPlain,
            String university,
            String race,
            String religion
    ) {
        if (blank(email) || blank(password)) {
            return;
        }
        String normalizedEmail = email.trim().toLowerCase();
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));
        Optional<UserAccount> existing = userAccountRepository.findByEmailIgnoreCase(normalizedEmail);

        UserAccount user = existing.orElseGet(UserAccount::new);
        boolean created = existing.isEmpty();
        user.setEmail(normalizedEmail);
        user.setPassword(hash);
        user.setFullName(fullName);
        user.setPhoneNumber(phone);
        user.setIcNumber(icCryptoService.encryptForStorage(icPlain));
        user.setUniversity(university);
        user.setRace(race);
        user.setReligion(religion);
        user.setRole(role);
        user.setVerified(true);
        user.setAccountStatus("active");
        user.setDocumentVerificationStatus("verified");
        user.setEmailVerificationToken(null);
        userAccountRepository.save(user);

        if (created) {
            log.info("Bootstrap created demo {} account ({})", role, normalizedEmail);
        } else {
            log.info("Demo {} account ({}) reconciled — password and flags synced from config.", role, normalizedEmail);
        }
    }

    private static boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
