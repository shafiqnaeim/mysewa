package com.mysewa.model;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

/**
 * Password reset data is stored on {@link User} ({@code password_reset_token}, {@code password_reset_expires_at}).
 */
@Data
@Builder
public class PasswordResetToken {
    private String token;
    private LocalDateTime expiresAt;
}
