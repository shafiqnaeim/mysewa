package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.payment.DepositCalculator;

import java.math.BigDecimal;

/**
 * Populates deposit fields on {@link ApplicationResponse} for API clients.
 * <p>
 * {@code depositAmount} — required deposit from the property listing (landlord-configured).
 * {@code depositPaid} / {@code depositStatus} — whether the student has completed payment.
 */
public final class ApplicationDepositEnricher {

    private ApplicationDepositEnricher() {
    }

    public static void apply(ApplicationResponse row, Application app, PropertyEntity property, Boolean depositPaid) {
        if (depositPaid != null) {
            row.depositPaid = depositPaid;
        }
        row.depositStatus = Boolean.TRUE.equals(row.depositPaid) ? "paid" : "pending";

        if (property == null) {
            if (app != null) {
                row.displayStatus = ApplicationDisplayStatus.resolveKey(app, Boolean.TRUE.equals(row.depositPaid));
                row.displayStatusLabel = ApplicationDisplayStatus.labelForKey(row.displayStatus);
            }
            return;
        }

        row.propertyDepositAmount = DepositCalculator.readPropertyDeposit(property);
        BigDecimal required = DepositCalculator.resolveForApplication(app, property);
        row.depositAmount = required;
        row.depositAmountSuggested = required;

        if (app != null) {
            row.displayStatus = ApplicationDisplayStatus.resolveKey(app, Boolean.TRUE.equals(row.depositPaid));
            row.displayStatusLabel = ApplicationDisplayStatus.labelForKey(row.displayStatus);
        }
    }
}
