package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.IcCryptoService;
import com.mysewa.api.web.auth.AuthResponse;
import com.mysewa.api.web.auth.AuthUserResponse;
import com.mysewa.api.web.auth.ForgotPasswordRequest;
import com.mysewa.api.web.auth.LoginRequest;
import com.mysewa.api.web.auth.ProfileUpdateRequest;
import com.mysewa.api.web.auth.RegisterRequest;
import com.mysewa.api.web.auth.ResetPasswordRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService authService;
    private final IcCryptoService icCryptoService;

    public AuthController(AuthService authService, IcCryptoService icCryptoService) {
        this.authService = authService;
        this.icCryptoService = icCryptoService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Registration successful. Please verify your email before signing in."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UserAccount user = authService.login(request);
            String token = authService.generateToken(user.getId());
            return ResponseEntity.ok(AuthResponse.of("Login successful", token, AuthUserResponse.from(user, icCryptoService)));
        } catch (IllegalArgumentException ex) {
            String message = ex.getMessage();
            if ("Wrong email.".equals(message) || "Wrong password.".equals(message)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", message));
            }
            if (message != null && message.contains("suspended")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message, "accountSuspended", true));
            }
            if (message != null && message.contains("verify your email")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message, "emailVerificationRequired", true));
            }
            return ResponseEntity.badRequest().body(Map.of("message", message));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can sign in now."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password reset link sent. Check your email."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.resendVerificationEmail(request);
            return ResponseEntity.ok(Map.of("message", "Verification email resent successfully."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password reset successful. Please sign in with your new password."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            UserAccount user = authService.me(authorization);
            return ResponseEntity.ok(Map.of("user", AuthUserResponse.from(user, icCryptoService)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ProfileUpdateRequest request
    ) {
        try {
            UserAccount user = authService.updateProfile(authorization, request);
            return ResponseEntity.ok(Map.of("user", AuthUserResponse.from(user, icCryptoService)));
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Invalid request";
            if (msg.contains("only available for student and landlord")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", msg));
            }
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }
    }
}
