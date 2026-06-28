package com.mysewa.api.repo;

import com.mysewa.api.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Integer> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);
    Optional<UserAccount> findByEmailVerificationToken(String token);
    Optional<UserAccount> findByPasswordResetToken(String token);
    Optional<UserAccount> findByIcNumber(String icNumber);

    long countByRoleIgnoreCase(String role);
}
