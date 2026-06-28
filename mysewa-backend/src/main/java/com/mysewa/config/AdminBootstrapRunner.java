package com.mysewa.config;

import com.mysewa.enums.Role;
import com.mysewa.model.User;
import com.mysewa.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@localhost}")
    private String adminEmail;

    @Value("${app.admin.password:Admin123}")
    private String adminPassword;

    public AdminBootstrapRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminEmail == null || adminEmail.isBlank()) {
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        LocalDateTime now = LocalDateTime.now();
        if (existing.isPresent()) {
            User user = existing.get();
            user.setRole(Role.ADMIN);
            user.setVerified(true);
            user.setAccountStatus("active");
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setUpdatedAt(now);
            userRepository.save(user);
            return;
        }
        User admin = User.builder()
                .email(email)
                .password(passwordEncoder.encode(adminPassword))
                .fullName("System Administrator")
                .phoneNumber("+6012-0000000")
                .icNumber("000000-00-0000")
                .university("None")
                .role(Role.ADMIN)
                .verified(true)
                .accountStatus("active")
                .documentVerificationStatus("verified")
                .createdAt(now)
                .updatedAt(now)
                .build();
        userRepository.save(admin);
    }
}
