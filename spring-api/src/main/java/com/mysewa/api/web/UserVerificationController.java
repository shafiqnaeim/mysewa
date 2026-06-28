package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.VerificationService;
import com.mysewa.api.web.auth.AuthUserResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/v1/users/me/verification", "/api/users/me/verification"})
@CrossOrigin
public class UserVerificationController {

    private final AuthService authService;
    private final VerificationService verificationService;

    public UserVerificationController(AuthService authService, VerificationService verificationService) {
        this.authService = authService;
        this.verificationService = verificationService;
    }

    @GetMapping
    public ResponseEntity<?> status(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            UserAccount user = authService.me(authorization);
            return ResponseEntity.ok(verificationService.myVerificationStatus(user));
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDocument(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("slot") String slot,
            @RequestPart("file") MultipartFile file
    ) {
        try {
            UserAccount user = authService.me(authorization);
            Map<String, Object> body = verificationService.uploadDocument(user, slot, file);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Upload failed"));
        }
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            UserAccount user = authService.me(authorization);
            Map<String, Object> body = verificationService.submitForReview(user);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
    }

    @PostMapping("/ic-confirm")
    public ResponseEntity<?> confirmIc(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) IcOcrConfirmRequest request
    ) {
        try {
            UserAccount user = authService.me(authorization);
            String icNumber = request == null ? "" : request.icNumber;
            String extractedName = request == null ? null : request.extractedName;
            Map<String, Object> body = verificationService.confirmIcFromOcr(user, icNumber, extractedName);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
    }

    @DeleteMapping("/ic-confirm")
    public ResponseEntity<?> clearIc(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            UserAccount user = authService.me(authorization);
            verificationService.clearIcConfirmation(user);
            return ResponseEntity.ok(Map.of("icConfirmed", false));
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
    }

    private static ResponseEntity<?> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", m));
    }
}
