package com.mysewa.converter;

import com.mysewa.enums.BookingStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BookingStatusConverter implements AttributeConverter<BookingStatus, String> {

    @Override
    public String convertToDatabaseColumn(BookingStatus status) {
        return status == null ? null : status.name().toLowerCase();
    }

    @Override
    public BookingStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return BookingStatus.valueOf(dbData.trim().toUpperCase());
    }
}
