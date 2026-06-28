package com.mysewa.api.web.auth;

/**
 * Self-service profile update (student / landlord / admin). Email, password, role, and IC are not changed here.
 */
public class ProfileUpdateRequest {
    /** Required — combined display name (trimmed). */
    public String fullName;
    /** Optional — must match {@code +60xx-xxxxxxx} when provided. */
    public String phoneNumber;
    /** Optional — e.g. Malaysia / Singapore (max 100 chars stored). */
    public String country;
    /** Optional — student programme / course (landlord may omit). */
    public String programStudy;
    /** Optional — e.g. Year 1 (landlord may omit). */
    public String academicYear;
}
