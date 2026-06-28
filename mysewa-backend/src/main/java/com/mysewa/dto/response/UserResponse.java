package com.mysewa.dto.response;

import com.mysewa.enums.Role;
import com.mysewa.model.User;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private Integer id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String university;
    private Integer universityId;
    private String race;
    private String religion;
    private Role role;
    private boolean verified;
    private String accountStatus;
    private String documentVerificationStatus;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .university(user.getUniversity())
                .universityId(user.getUniversityId())
                .race(user.getRace())
                .religion(user.getReligion())
                .role(user.getRole())
                .verified(user.isVerified())
                .accountStatus(user.getAccountStatus())
                .documentVerificationStatus(user.getDocumentVerificationStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
