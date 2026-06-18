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
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ensures {@code app.admin.email} resolves to a verified {@code admin} account with {@code app.admin.password}.
 * Creates the user when missing; if the row already exists, updates role, password, and verification flags
 * so you can reuse the mailbox (for example switching a prior student row to administrator).
 */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserAccountRepository userAccountRepository;
    private final IcCryptoService icCryptoService;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public AdminBootstrapRunner(UserAccountRepository userAccountRepository, IcCryptoService icCryptoService) {
        this.userAccountRepository = userAccountRepository;
        this.icCryptoService = icCryptoService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (blank(adminEmail) || blank(adminPassword)) {
            log.info("Admin bootstrap skipped (set app.admin.email and app.admin.password).");
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        Optional<UserAccount> existing = userAccountRepository.findByEmailIgnoreCase(email);
        String hash = BCrypt.hashpw(adminPassword, BCrypt.gensalt(10));

        if (existing.isEmpty()) {
            Optional<UserAccount> legacy = userAccountRepository.findByEmailIgnoreCase("admin@mysewa.local");
            if (legacy.isPresent() && "admin".equalsIgnoreCase(String.valueOf(legacy.get().getRole()))) {
                UserAccount u = legacy.get();
                u.setEmail(email);
                u.setPassword(hash);
                u.setRole("admin");
                u.setVerified(true);
                u.setAccountStatus("active");
                u.setDocumentVerificationStatus("exempt");
                u.setEmailVerificationToken(null);
                fillAdminProfileIfSparse(u, icCryptoService);
                userAccountRepository.save(u);
                log.warn("Migrated legacy admin@mysewa.local to configured admin email ({}).", email);
                return;
            }
        }

        if (existing.isPresent()) {
            UserAccount u = existing.get();
            u.setEmail(email);
            u.setPassword(hash);
            u.setRole("admin");
            u.setVerified(true);
            u.setAccountStatus("active");
            u.setDocumentVerificationStatus("exempt");
            u.setEmailVerificationToken(null);
            fillAdminProfileIfSparse(u, icCryptoService);
            userAccountRepository.save(u);
            log.warn("Configured admin ({}) reconciled — role set to admin and password synced from config.", email);
            return;
        }

        UserAccount admin = new UserAccount();
        admin.setEmail(email);
        admin.setPassword(hash);
        admin.setFullName("System Administrator");
        admin.setPhoneNumber("+6011-22334455");
        admin.setIcNumber(icCryptoService.encryptForStorage("910101-10-9101"));
        admin.setUniversity("N/A — System administration");
        admin.setRace(null);
        admin.setReligion(null);
        admin.setRole("admin");
        admin.setVerified(true);
        admin.setAccountStatus("active");
        admin.setDocumentVerificationStatus("exempt");
        admin.setEmailVerificationToken(null);

        userAccountRepository.save(admin);
        log.warn("Bootstrap created system admin ({}) — change APP_ADMIN_PASSWORD after first deploy if this host is shared.", email);
    }

    private static void fillAdminProfileIfSparse(UserAccount u, IcCryptoService icCryptoService) {
        if (blank(u.getFullName())) {
            u.setFullName("System Administrator");
        }
        if (blank(u.getPhoneNumber())) {
            u.setPhoneNumber("+6011-22334455");
        }
        if (blank(u.getIcNumber())) {
            u.setIcNumber(icCryptoService.encryptForStorage("910101-10-9101"));
        }
        if (blank(u.getUniversity())) {
            u.setUniversity("N/A — System administration");
        }
    }

    private static boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
