package com.mysewa.api.payment;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class DepositCalculator {

    public static final BigDecimal LANDLORD_DEPOSIT_MIN = new BigDecimal("100.00");
    public static final BigDecimal LANDLORD_DEPOSIT_MAX = new BigDecimal("5000.00");

    private DepositCalculator() {
    }

    /**
     * Amount the student pays: landlord-set value when accepting, otherwise {@link #compute(PropertyEntity)}.
     */
    public static BigDecimal resolveForApplication(Application application, PropertyEntity property) {
        if (application != null && application.getLandlordDepositAmount() != null) {
            BigDecimal d = application.getLandlordDepositAmount();
            if (d.compareTo(BigDecimal.ZERO) > 0) {
                return d.setScale(2, RoundingMode.HALF_UP);
            }
        }
        if (property == null) {
            return new BigDecimal("500.00");
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
     * Same rules as prototype deposit: 25% of monthly rent, clamped RM 100–5000, default RM 500 if price missing.
     */
    public static BigDecimal compute(PropertyEntity property) {
        BigDecimal amount;
        if (property.getPrice() != null && property.getPrice() > 0) {
            amount = BigDecimal.valueOf(property.getPrice()).multiply(new BigDecimal("0.25")).setScale(2, RoundingMode.HALF_UP);
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
