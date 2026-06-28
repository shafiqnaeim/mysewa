package com.mysewa.model;

import com.mysewa.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 191)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone_number", nullable = false, length = 50)
    private String phoneNumber;

    @Column(name = "ic_number", nullable = false, length = 50)
    private String icNumber;

    @Column(nullable = false)
    private String university;

    @Column(name = "university_id")
    private Integer universityId;

    @Column(length = 100)
    private String race;

    @Column(length = 100)
    private String religion;

    @Column(length = 100)
    private String country;

    @Column(name = "program_study", length = 255)
    private String programStudy;

    @Column(name = "academic_year", length = 32)
    private String academicYear;

    @Column(nullable = false, length = 50)
    private Role role;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(name = "account_status", length = 50)
    @Builder.Default
    private String accountStatus = "active";

    @Column(name = "document_verification_status", length = 50)
    @Builder.Default
    private String documentVerificationStatus = "pending";

    @Column(name = "email_verification_token")
    private String emailVerificationToken;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_expires_at")
    private LocalDateTime passwordResetExpiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
