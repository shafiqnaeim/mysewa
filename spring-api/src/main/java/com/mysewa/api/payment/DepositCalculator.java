package com.mysewa.api.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class DepositCalculator {

    public static final BigDecimal LANDLORD_DEPOSIT_MIN = new BigDecimal("100.00");
    public static final BigDecimal LANDLORD_DEPOSIT_MAX = new BigDecimal("5000.00");

    private static final ObjectMapper JSON = new ObjectMapper();

    private DepositCalculator() {
    }

    /**
     * Deposit configured on the property listing ({@code rental_style} JSON {@code deposit} field).
     */
    public static BigDecimal readPropertyDeposit(PropertyEntity property) {
        if (property == null) {
            return null;
        }
        String rentalStyle = property.getRentalStyle();
        if (rentalStyle == null || rentalStyle.isBlank()) {
            return null;
        }
        try {
            JsonNode root = JSON.readTree(rentalStyle);
            if (root == null || !root.has("deposit") || root.get("deposit").isNull()) {
                return null;
            }
            BigDecimal amount = root.get("deposit").decimalValue();
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                return null;
            }
            return amount.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Amount the student pays: property listing deposit when configured, otherwise landlord-set on
     * acceptance, otherwise legacy rent-based estimate.
     */
    public static BigDecimal resolveForApplication(Application application, PropertyEntity property) {
        BigDecimal listing = readPropertyDeposit(property);
        if (listing != null) {
            return listing;
        }
        if (application != null && application.getLandlordDepositAmount() != null) {
            BigDecimal d = application.getLandlordDepositAmount();
            if (d.compareTo(BigDecimal.ZERO) > 0) {
                return d.setScale(2, RoundingMode.HALF_UP);
            }
        }
        return compute(property);
    }

    public static boolean isValidLandlordDeposit(BigDecimal amount) {
        if (amount == null) {
            return false;
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        return scaled.compareTo(LANDLORD_DEPOSIT_MIN) >= 0 && scaled.compareTo(LANDLORD_DEPOSIT_MAX) <= 0;
    }

    /**
     * Listing deposit when set; otherwise legacy prototype estimate (25% of monthly rent, clamped).
     */
    public static BigDecimal compute(PropertyEntity property) {
        BigDecimal fromListing = readPropertyDeposit(property);
        if (fromListing != null) {
            return fromListing;
        }
        if (property == null) {
            return new BigDecimal("500.00");
        }
        BigDecimal amount;
        if (property.getPrice() != null && property.getPrice() > 0) {
            amount = BigDecimal.valueOf(property.getPrice())
                    .multiply(new BigDecimal("0.25"))
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            amount = new BigDecimal("500.00");
        }
        if (amount.compareTo(new BigDecimal("100")) < 0) {
            amount = new BigDecimal("100.00");
        }
        if (amount.compareTo(new BigDecimal("5000")) > 0) {
            amount = new BigDecimal("5000.00");
        }
        return amount;
    }
}
