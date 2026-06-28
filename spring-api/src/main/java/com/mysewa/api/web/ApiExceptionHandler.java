package com.mysewa.api.web;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Locale;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String message = "Could not save — check that values are valid and not duplicated.";
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (raw != null && raw.toLowerCase().contains("duplicate")) {
            message = "Email already registered";
        } else if (raw != null && raw.toLowerCase().contains("ic_number")) {
            message = "Could not store IC number — run docs/migrations/2026-06-22-users-ic-number-length.sql";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> handleDataAccess(DataAccessException ex) {
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String message = "Could not save application — please try again.";
        if (raw != null) {
            String lower = raw.toLowerCase(Locale.ROOT);
            if (lower.contains("landlord_message")) {
                message = "Database is missing landlord_message on applications — run docs/migrations/2026-06-21-application-landlord-message.sql";
            }
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", message));
    }
}
