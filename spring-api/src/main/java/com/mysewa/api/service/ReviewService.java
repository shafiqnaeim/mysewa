package com.mysewa.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.PropertyReview;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.PropertyReviewRepository;
import com.mysewa.api.web.ApplicationDisplayStatus;
import com.mysewa.api.web.ReviewCreateRequest;
import com.mysewa.api.web.ReviewItemResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ReviewService {

    private static final int MAX_PUBLIC_COMMENT = 500;
    private static final int MAX_CATEGORY_COMMENT = 200;
    private static final int MAX_PHOTOS = 5;
    private static final Set<String> CATEGORY_KEYS = Set.of(
            "cleanliness",
            "condition",
            "amenities",
            "landlord",
            "location",
            "value",
            "overall"
    );

    private final PropertyReviewRepository propertyReviewRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ObjectMapper objectMapper;

    public ReviewService(
            PropertyReviewRepository propertyReviewRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            FinancialTransactionRepository financialTransactionRepository,
            ObjectMapper objectMapper
    ) {
        this.propertyReviewRepository = propertyReviewRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.objectMapper = objectMapper;
    }

    public boolean canStudentSubmitReview(Integer propertyId, Integer studentId) {
        if (propertyId == null || studentId == null) {
            return false;
        }
        if (propertyReviewRepository.existsByPropertyIdAndStudentId(propertyId, studentId)) {
            return false;
        }
        return resolveTenancyApplication(propertyId, studentId).isPresent();
    }

    public Optional<Application> resolveTenancyApplication(Integer propertyId, Integer studentId) {
        Optional<Application> appOpt = applicationRepository.findByPropertyIdAndStudentId(propertyId, studentId);
        if (appOpt.isEmpty()) {
            return Optional.empty();
        }
        Application app = appOpt.get();
        if (!isReviewEligibleApplication(app)) {
            return Optional.empty();
        }
        return Optional.of(app);
    }

    /**
     * Approved / confirmed bookings may be reviewed — no need to wait for tenancy to end.
     */
    public boolean isReviewEligibleApplication(Application app) {
        if (app == null) {
            return false;
        }
        String status = nullSafe(app.getStatus()).toLowerCase(Locale.ROOT);
        if ("rejected".equals(status) || "pending".equals(status)) {
            return false;
        }
        if (Set.of("accepted", "approved", "confirmed", "completed").contains(status)) {
            return true;
        }
        boolean depositPaid = financialTransactionRepository.hasCompletedDeposit(app.getId());
        String displayKey = ApplicationDisplayStatus.resolveKey(app, depositPaid);
        return Set.of("pending_payment", "confirmed", "active", "completed").contains(displayKey);
    }

    /** @deprecated use {@link #isReviewEligibleApplication} */
    public boolean isCompletedTenancy(Application app) {
        return isReviewEligibleApplication(app);
    }

    @Transactional
    public PropertyReview createReview(UserAccount student, ReviewCreateRequest request) {
        if (request == null || request.getPropertyId() == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        Integer propertyId = request.getPropertyId();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(propertyId);
        if (propOpt.isEmpty()) {
            throw new IllegalArgumentException("Property not found");
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() != null && property.getLandlordId().equals(student.getId())) {
            throw new IllegalStateException("You cannot review your own listing");
        }

        Application app = resolveTenancyApplication(propertyId, student.getId())
                .orElseThrow(() -> new IllegalStateException(
                        "You can only leave a review after the landlord has approved your application for this property."
                ));

        if (propertyReviewRepository.existsByPropertyIdAndStudentId(propertyId, student.getId())) {
            throw new IllegalStateException("You have already reviewed this property");
        }

        ParsedReviewInput parsed = parseReviewInput(request);
        PropertyReview row = new PropertyReview();
        row.setBookingId(request.getBookingId() != null ? request.getBookingId() : app.getId());
        row.setPropertyId(propertyId);
        row.setStudentId(student.getId());
        row.setRatingCleanliness(parsed.ratingCleanliness);
        row.setRatingCondition(parsed.ratingCondition);
        row.setRatingAmenities(parsed.ratingAmenities);
        row.setRatingLandlord(parsed.ratingLandlord);
        row.setRatingLocation(parsed.ratingLocation);
        row.setRatingValue(parsed.ratingValue);
        row.setRatingOverall(parsed.ratingOverall);
        row.setPublicComment(parsed.publicComment);
        row.setCategoryComments(writeJson(parsed.categoryComments));
        row.setPhotos(writeJson(parsed.photos));
        row.setAnonymous(Boolean.TRUE.equals(request != null ? request.getAnonymous() : null));
        row.setCreatedAt(LocalDateTime.now());
        return propertyReviewRepository.save(row);
    }

    @Transactional
    public PropertyReview updateReview(UserAccount student, Integer reviewId, ReviewCreateRequest request) {
        if (reviewId == null) {
            throw new IllegalArgumentException("reviewId is required");
        }
        PropertyReview row = propertyReviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        if (!student.getId().equals(row.getStudentId())) {
            throw new IllegalStateException("You can only edit your own reviews");
        }
        ParsedReviewInput parsed = parseReviewInput(request);
        row.setRatingCleanliness(parsed.ratingCleanliness);
        row.setRatingCondition(parsed.ratingCondition);
        row.setRatingAmenities(parsed.ratingAmenities);
        row.setRatingLandlord(parsed.ratingLandlord);
        row.setRatingLocation(parsed.ratingLocation);
        row.setRatingValue(parsed.ratingValue);
        row.setRatingOverall(parsed.ratingOverall);
        row.setPublicComment(parsed.publicComment);
        row.setCategoryComments(writeJson(parsed.categoryComments));
        if (request != null && request.getPhotos() != null) {
            row.setPhotos(writeJson(parsed.photos));
        }
        if (request != null && request.getAnonymous() != null) {
            row.setAnonymous(request.getAnonymous());
        }
        return propertyReviewRepository.save(row);
    }

    public List<String> uploadReviewPhotos(UserAccount student, MultipartFile[] images) throws IOException {
        if (images == null || images.length == 0) {
            throw new IllegalArgumentException("No files uploaded");
        }
        if (images.length > MAX_PHOTOS) {
            throw new IllegalArgumentException("You can upload up to " + MAX_PHOTOS + " photos");
        }
        Path uploadDir = Path.of("uploads", "review-photos", String.valueOf(student.getId()));
        Files.createDirectories(uploadDir);
        List<String> uploaded = new ArrayList<>();
        for (MultipartFile file : images) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            String original = file.getOriginalFilename() == null ? "photo" : file.getOriginalFilename();
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0) {
                ext = original.substring(dot).toLowerCase(Locale.ROOT);
            }
            if (!Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif").contains(ext)) {
                throw new IllegalArgumentException("Only JPG, PNG, WEBP, or GIF images are allowed");
            }
            String name = UUID.randomUUID() + ext;
            Path target = uploadDir.resolve(name);
            Files.copy(file.getInputStream(), target);
            uploaded.add("/uploads/review-photos/" + student.getId() + "/" + name);
        }
        if (uploaded.isEmpty()) {
            throw new IllegalArgumentException("No valid image files uploaded");
        }
        return uploaded;
    }

    public Map<Integer, double[]> reviewStatsForProperties(List<Integer> propertyIds) {
        Map<Integer, double[]> map = new LinkedHashMap<>();
        if (propertyIds == null || propertyIds.isEmpty()) {
            return map;
        }
        for (Object[] row : propertyReviewRepository.aggregateCategoryRatingsByPropertyIds(propertyIds)) {
            if (row == null || row.length < 3 || row[0] == null) {
                continue;
            }
            Integer pid = (Integer) row[0];
            Number avgOverall = (Number) row[1];
            Number cnt = (Number) row[2];
            map.put(pid, new double[]{
                    avgOverall != null ? avgOverall.doubleValue() : 0d,
                    cnt != null ? cnt.longValue() : 0L
            });
        }
        return map;
    }

    public Map<String, Object> aggregatesForProperty(Integer propertyId) {
        List<Object[]> rows = propertyReviewRepository.aggregateCategoryRatingsByPropertyIds(List.of(propertyId));
        if (rows.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("totalReviews", 0L);
            return empty;
        }
        return ReviewItemResponse.aggregatesFromRow(rows.get(0));
    }

    private ParsedReviewInput parseReviewInput(ReviewCreateRequest request) {
        ParsedReviewInput parsed = new ParsedReviewInput();
        parsed.ratingCleanliness = requireRating(request != null ? request.getRatingCleanliness() : null, "cleanliness");
        parsed.ratingCondition = requireRating(request != null ? request.getRatingCondition() : null, "condition");
        parsed.ratingAmenities = requireRating(request != null ? request.getRatingAmenities() : null, "amenities");
        parsed.ratingLandlord = requireRating(request != null ? request.getRatingLandlord() : null, "landlord");
        parsed.ratingLocation = requireRating(request != null ? request.getRatingLocation() : null, "location");
        parsed.ratingValue = requireRating(request != null ? request.getRatingValue() : null, "value");

        Integer overall = request != null ? request.getRatingOverall() : null;
        if (overall == null && request != null) {
            overall = request.getRating();
        }
        parsed.ratingOverall = requireRating(overall, "overall");

        String publicComment = "";
        if (request != null) {
            if (StringUtils.hasText(request.getPublicComment())) {
                publicComment = request.getPublicComment().trim();
            } else if (request.getComment() != null) {
                publicComment = request.getComment().trim();
            }
        }
        if (publicComment.length() > MAX_PUBLIC_COMMENT) {
            throw new IllegalArgumentException("Public comment must be at most " + MAX_PUBLIC_COMMENT + " characters");
        }
        parsed.publicComment = publicComment.isEmpty() ? null : publicComment;

        parsed.categoryComments = sanitizeCategoryComments(request != null ? request.getCategoryComments() : null);

        List<String> photos = request != null && request.getPhotos() != null ? request.getPhotos() : List.of();
        if (photos.size() > MAX_PHOTOS) {
            throw new IllegalArgumentException("You can attach up to " + MAX_PHOTOS + " photos");
        }
        parsed.photos = photos.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .limit(MAX_PHOTOS)
                .toList();
        return parsed;
    }

    private Map<String, String> sanitizeCategoryComments(Map<String, String> raw) {
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : raw.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                continue;
            }
            String key = entry.getKey().trim().toLowerCase(Locale.ROOT);
            if (!CATEGORY_KEYS.contains(key)) {
                continue;
            }
            String value = entry.getValue().trim();
            if (value.isEmpty()) {
                continue;
            }
            if (value.length() > MAX_CATEGORY_COMMENT) {
                throw new IllegalArgumentException("Category comments must be at most " + MAX_CATEGORY_COMMENT + " characters");
            }
            out.put(key, value);
        }
        return out;
    }

    private int requireRating(Integer value, String label) {
        if (value == null || value < 1 || value > 5) {
            throw new IllegalArgumentException("Rating for " + label + " must be between 1 and 5");
        }
        return value;
    }

    private String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List<?> list && list.isEmpty()) {
            return null;
        }
        if (value instanceof Map<?, ?> map && map.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Could not serialize review payload");
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    private static final class ParsedReviewInput {
        int ratingCleanliness;
        int ratingCondition;
        int ratingAmenities;
        int ratingLandlord;
        int ratingLocation;
        int ratingValue;
        int ratingOverall;
        String publicComment;
        Map<String, String> categoryComments = Map.of();
        List<String> photos = List.of();
    }
}
