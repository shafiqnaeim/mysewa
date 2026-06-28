package com.mysewa.dto.response;

import com.mysewa.model.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String message;
    private String token;
    private UserResponse user;

    public static AuthResponse of(String message, String token, User user) {
        return AuthResponse.builder()
                .message(message)
                .token(token)
                .user(UserResponse.from(user))
                .build();
    }
}
