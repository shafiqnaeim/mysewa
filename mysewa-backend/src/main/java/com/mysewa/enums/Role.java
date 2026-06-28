package com.mysewa.enums;

public enum Role {
    STUDENT,
    LANDLORD,
    ADMIN;

    public static Role fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Role cannot be null or blank");
        }
        return Role.valueOf(value.trim().toUpperCase());
    }
}
