package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;

import java.time.format.DateTimeFormatter;

public class AdminUserRowResponse {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Integer id;
    public String email;
    public String fullName;
    public String role;
    public boolean verified;
    public String accountStatus;
    public String documentVerificationStatus;
    public String university;
    public String createdAt;

    public static AdminUserRowResponse from(UserAccount u) {
        AdminUserRowResponse r = new AdminUserRowResponse();
        r.id = u.getId();
        r.email = u.getEmail();
        r.fullName = u.getFullName();
        r.role = u.getRole();
        r.verified = u.isVerified();
        r.accountStatus = u.getAccountStatus() != null && !u.getAccountStatus().isEmpty() ? u.getAccountStatus() : "active";
        r.documentVerificationStatus = u.getDocumentVerificationStatus();
        r.university = u.getUniversity();
        r.createdAt = u.getCreatedAt() != null ? ISO.format(u.getCreatedAt()) : null;
        return r;
    }
}
