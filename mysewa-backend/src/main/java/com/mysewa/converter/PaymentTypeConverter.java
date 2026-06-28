package com.mysewa.converter;

import com.mysewa.enums.PaymentType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class PaymentTypeConverter implements AttributeConverter<PaymentType, String> {

    @Override
    public String convertToDatabaseColumn(PaymentType type) {
        if (type == null) {
            return null;
        }
        return switch (type) {
            case DEPOSIT -> "deposit";
            case RENT -> "rent";
            case OTHER -> "other";
        };
    }

    @Override
    public PaymentType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        String normalized = dbData.trim().toLowerCase();
        if (normalized.contains("deposit")) {
            return PaymentType.DEPOSIT;
        }
        if (normalized.contains("rent")) {
            return PaymentType.RENT;
        }
        return PaymentType.OTHER;
    }
}
