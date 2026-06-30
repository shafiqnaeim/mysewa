package com.mysewa.api.web;

import com.mysewa.api.domain.Report;
import com.mysewa.api.domain.UserAccount;

import java.time.format.DateTimeFormatter;

public class ReportItemResponse {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Integer id;
    public Integer propertyId;
    public String propertyName;
    public Integer applicationId;
    public Integer studentId;
    public String studentDisplayName;
    public String category;
    public String description;
    public String photoUrl;
    public String status;
    public String landlordNotes;
    public String submittedAt;
    public String acknowledgedAt;
    public String resolvedAt;
    public String createdAt;
    public String updatedAt;

    public static ReportItemResponse from(Report r, String propertyName, UserAccount student) {
        ReportItemResponse o = new ReportItemResponse();
        o.id = r.getId();
        o.propertyId = r.getPropertyId();
        o.propertyName = propertyName;
        o.applicationId = r.getApplicationId();
        o.studentId = r.getStudentId();
        o.studentDisplayName = displayName(student);
        o.category = r.getCategory();
        o.description = r.getDescription();
        o.photoUrl = r.getPhotoUrl();
        o.status = r.getStatus();
        o.landlordNotes = r.getLandlordNotes();
        o.submittedAt = format(r.getSubmittedAt());
        o.acknowledgedAt = format(r.getAcknowledgedAt());
        o.resolvedAt = format(r.getResolvedAt());
        o.createdAt = format(r.getCreatedAt());
        o.updatedAt = format(r.getUpdatedAt());
        return o;
    }

    private static String format(java.time.LocalDateTime value) {
        return value != null ? ISO.format(value) : null;
    }

    private static String displayName(UserAccount u) {
        if (u == null || u.getFullName() == null || u.getFullName().trim().isEmpty()) {
            return "Student";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts[0];
    }
}
