package com.mysewa.api.web;

import com.mysewa.api.domain.PropertyReview;
import com.mysewa.api.domain.UserAccount;

import java.time.format.DateTimeFormatter;

public class ReviewItemResponse {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Integer id;
    public Integer propertyId;
    public Integer rating;
    public String comment;
    public String studentDisplayName;
    public String createdAt;
    public String propertyName;

    public static ReviewItemResponse from(PropertyReview r, UserAccount student) {
        ReviewItemResponse o = new ReviewItemResponse();
        o.id = r.getId();
        o.propertyId = r.getPropertyId();
        o.rating = r.getRating();
        o.comment = r.getComment();
        o.studentDisplayName = displayName(student);
        o.createdAt = r.getCreatedAt() != null ? ISO.format(r.getCreatedAt()) : null;
        return o;
    }

    private static String displayName(UserAccount u) {
        if (u == null || u.getFullName() == null || u.getFullName().trim().isEmpty()) {
            return "Student";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts[0];
    }
}
