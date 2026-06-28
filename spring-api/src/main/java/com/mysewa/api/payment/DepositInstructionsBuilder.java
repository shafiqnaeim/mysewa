package com.mysewa.api.payment;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.PropertyService;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Landlord property payment details for student deposit UI (no platform dummy fallback).
 */
public final class DepositInstructionsBuilder {

    private DepositInstructionsBuilder() {
    }

    public static Map<String, Object> build(
            Application application,
            PropertyEntity property,
            UserAccount landlord,
            BigDecimal depositAmount,
            boolean toyyibpayEnabled
    ) {
        Map<String, Object> body = new LinkedHashMap<>();

        String propertyBank = trim(property != null ? property.getBankName() : null);
        String propertyAccount = trim(property != null ? property.getAccountNumber() : null);
        String propertyHolder = trim(property != null ? property.getAccountHolder() : null);
        String propertyQr = trim(property != null ? property.getQrCodeUrl() : null);
        String landlordName = landlord != null ? trim(landlord.getFullName()) : null;

        String bankHolder = trim(propertyHolder);
        boolean bankDetailsProvided = StringUtils.hasText(propertyBank) && StringUtils.hasText(propertyAccount);
        boolean qrProvided = StringUtils.hasText(propertyQr);

        body.put("bankName", propertyBank);
        body.put("bankAccount", propertyAccount);
        body.put("bankHolder", bankHolder);
        body.put("landlordName", landlordName);
        body.put("qrImageUrl", qrProvided ? propertyQr : null);
        body.put("bankDetailsProvided", bankDetailsProvided);
        body.put("qrProvided", qrProvided);
        body.put("detailsProvided", bankDetailsProvided || qrProvided);
        body.put("source", "property");

        if (property != null) {
            body.put("whatsappNumber", trim(property.getWhatsappNumber()));
            body.put("contactPhone", trim(property.getContactPhone()));
            body.put("contactEmail", trim(property.getContactEmail()));
            body.put("paymentDueDate", trim(property.getPaymentDueDate()));
            body.put("paymentMethods", PropertyService.parsePaymentMethods(property.getPaymentMethods()));
        } else {
            body.put("paymentMethods", List.of());
        }

        body.put("allowedChannels", resolveAllowedChannels(property, toyyibpayEnabled));
        body.put("depositAmount", depositAmount);
        body.put(
                "note",
                bankDetailsProvided || qrProvided
                        ? "Transfer the exact deposit amount using your landlord's details below, then confirm in MySewa."
                        : "Payment details not yet provided by landlord."
        );
        return body;
    }

    private static List<String> resolveAllowedChannels(PropertyEntity property, boolean toyyibConfigured) {
        List<String> methods = property != null
                ? PropertyService.parsePaymentMethods(property.getPaymentMethods())
                : List.of();
        List<String> channels = new ArrayList<>();
        for (String method : methods) {
            String key = method == null ? "" : method.trim().toLowerCase(Locale.ROOT);
            switch (key) {
                case "online_banking" -> channels.add("bank_transfer");
                case "duitnow_qr", "duitnow" -> channels.add("duitnow_qr");
                case "cash" -> channels.add("cash");
                case "toyyibpay" -> {
                    if (toyyibConfigured) {
                        channels.add("toyyibpay");
                    }
                }
                default -> {
                }
            }
        }
        return channels;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private static String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
