package com.mysewa.api.web;

import com.mysewa.api.domain.Application;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * Client-facing booking lifecycle labels derived from application status, deposit, and lease dates.
 */
public final class ApplicationDisplayStatus {

    private ApplicationDisplayStatus() {
    }

    public static String resolveKey(Application app, boolean depositPaid) {
        if (app == null) {
            return "pending";
        }
        String status = app.getStatus() == null ? "pending" : app.getStatus().toLowerCase(Locale.ROOT);
        if ("rejected".equals(status)) {
            return "rejected";
        }
        if ("pending".equals(status)) {
            return "pending";
        }
        if ("completed".equals(status)) {
            return "completed";
        }
        if ("accepted".equals(status)) {
            if (!depositPaid) {
                return "pending_payment";
            }
            LocalDate today = LocalDate.now();
            LocalDate moveIn = parseDate(app.getPreferredMoveIn());
            LocalDate moveOut = parseDate(app.getLeaseEnd());
            if (moveOut != null && today.isAfter(moveOut)) {
                return "completed";
            }
            if (moveIn != null && !today.isBefore(moveIn) && (moveOut == null || !today.isAfter(moveOut))) {
                return "active";
            }
            return "confirmed";
        }
        return "pending";
    }

    public static String resolveLabel(Application app, boolean depositPaid) {
        return labelForKey(resolveKey(app, depositPaid));
    }

    public static String labelForKey(String key) {
        if (key == null) {
            return "PENDING";
        }
        return switch (key) {
            case "pending_payment" -> "PENDING PAYMENT";
            case "confirmed" -> "CONFIRMED";
            case "active" -> "ACTIVE";
            case "completed" -> "COMPLETED";
            case "rejected" -> "REJECTED";
            default -> "PENDING";
        };
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        try {
            if (trimmed.length() >= 10) {
                return LocalDate.parse(trimmed.substring(0, 10));
            }
            return LocalDate.parse(trimmed);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
