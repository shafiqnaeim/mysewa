package com.mysewa.api.service;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.web.ApplicationStatusUpdateRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Set;

@Service
public class ApplicationService {

    private static final Set<String> ALLOWED_DECISIONS = Set.of("accepted", "rejected");

    /**
     * Maps API / UI aliases to persisted workflow status.
     * Stored values: pending, accepted, rejected (completed is derived client-side).
     */
    public String normalizeLandlordDecisionStatus(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "approved", "approve", "accept", "accepted" -> "accepted";
            case "rejected", "reject", "declined" -> "rejected";
            case "pending" -> "pending";
            default -> normalized;
        };
    }

    public boolean isAllowedLandlordDecision(String normalized) {
        return normalized != null && ALLOWED_DECISIONS.contains(normalized);
    }

    public String resolveOptionalLandlordMessage(ApplicationStatusUpdateRequest request) {
        if (request == null || request.getMessage() == null) {
            return null;
        }
        String trimmed = request.getMessage().trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > 500 ? trimmed.substring(0, 500) : trimmed;
    }

    public void applyLandlordDecision(
            Application app,
            String normalizedStatus,
            ApplicationStatusUpdateRequest request,
            PropertyEntity property
    ) {
        if ("accepted".equals(normalizedStatus)) {
            BigDecimal dep = request != null ? request.getDepositAmount() : null;
            if (dep == null) {
                dep = com.mysewa.api.payment.DepositCalculator.compute(property);
            } else {
                dep = dep.setScale(2, RoundingMode.HALF_UP);
            }
            app.setLandlordDepositAmount(dep);
        } else {
            app.setLandlordDepositAmount(null);
        }
        app.setLandlordMessage(resolveOptionalLandlordMessage(request));
        app.setStatus(normalizedStatus);
    }
}
