package com.mysewa.api.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysewa.api.domain.PropertyReview;
import com.mysewa.api.domain.UserAccount;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReviewItemResponse {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final ObjectMapper JSON = new ObjectMapper();

    public Integer id;
    public Integer propertyId;
    public Integer bookingId;
    public Integer rating;
    public Integer ratingOverall;
    public Integer ratingCleanliness;
    public Integer ratingCondition;
    public Integer ratingAmenities;
    public Integer ratingLandlord;
    public Integer ratingLocation;
    public Integer ratingValue;
    public String comment;
    public String publicComment;
    public Map<String, String> categoryComments;
    public List<String> photos;
    public Boolean anonymous;
    public String studentDisplayName;
    public String createdAt;
    public String propertyName;

    public static ReviewItemResponse from(PropertyReview r, UserAccount student) {
        ReviewItemResponse o = new ReviewItemResponse();
        o.id = r.getId();
        o.propertyId = r.getPropertyId();
        o.bookingId = r.getBookingId();
        o.ratingOverall = r.getRatingOverall();
        o.rating = r.getRatingOverall();
        o.ratingCleanliness = r.getRatingCleanliness();
        o.ratingCondition = r.getRatingCondition();
        o.ratingAmenities = r.getRatingAmenities();
        o.ratingLandlord = r.getRatingLandlord();
        o.ratingLocation = r.getRatingLocation();
        o.ratingValue = r.getRatingValue();
        o.publicComment = r.getPublicComment();
        o.comment = r.getPublicComment();
        o.categoryComments = parseCategoryComments(r.getCategoryComments());
        o.photos = parsePhotos(r.getPhotos());
        o.anonymous = r.isAnonymous();
        o.studentDisplayName = resolveStudentDisplayName(r, student);
        o.createdAt = r.getCreatedAt() != null ? ISO.format(r.getCreatedAt()) : null;
        return o;
    }

    public static Map<String, Object> aggregatesFromRow(Object[] row) {
        Map<String, Object> agg = new LinkedHashMap<>();
        if (row == null || row.length < 3) {
            return agg;
        }
        agg.put("ratingOverall", roundAvg(row[1]));
        agg.put("totalReviews", row[2] != null ? ((Number) row[2]).longValue() : 0L);
        if (row.length >= 9) {
            agg.put("ratingCleanliness", roundAvg(row[3]));
            agg.put("ratingCondition", roundAvg(row[4]));
            agg.put("ratingAmenities", roundAvg(row[5]));
            agg.put("ratingLandlord", roundAvg(row[6]));
            agg.put("ratingLocation", roundAvg(row[7]));
            agg.put("ratingValue", roundAvg(row[8]));
        }
        return agg;
    }

    private static Double roundAvg(Object value) {
        if (value == null) {
            return null;
        }
        double n = ((Number) value).doubleValue();
        return Math.round(n * 10.0) / 10.0;
    }

    private static Map<String, String> parseCategoryComments(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return JSON.readValue(raw, new TypeReference<Map<String, String>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private static List<String> parsePhotos(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return JSON.readValue(raw, new TypeReference<List<String>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    private static String resolveStudentDisplayName(PropertyReview r, UserAccount student) {
        if (r != null && r.isAnonymous()) {
            return "Anonymous";
        }
        return displayName(student);
    }

    private static String displayName(UserAccount u) {
        if (u == null || u.getFullName() == null || u.getFullName().trim().isEmpty()) {
            return "Student";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts[0];
    }
}
