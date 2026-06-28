package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.PropertyReview;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.PropertyReviewRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/v1/reviews", "/api/reviews"})
@CrossOrigin
public class ReviewController {

    private final PropertyReviewRepository propertyReviewRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UserAccountRepository userAccountRepository;
    private final AuthService authService;

    public ReviewController(
            PropertyReviewRepository propertyReviewRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UserAccountRepository userAccountRepository,
            AuthService authService
    ) {
        this.propertyReviewRepository = propertyReviewRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.userAccountRepository = userAccountRepository;
        this.authService = authService;
    }

    @GetMapping({"/for-property/{propertyId}", "/property/{propertyId}"})
    public ResponseEntity<?> listForProperty(
            @PathVariable("propertyId") Integer propertyId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        if (propertyRepository.findById(propertyId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }

        List<PropertyReview> rows = propertyReviewRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId);
        List<ReviewItemResponse> items = new ArrayList<>();
        for (PropertyReview r : rows) {
            UserAccount st = userAccountRepository.findById(r.getStudentId()).orElse(null);
            items.add(ReviewItemResponse.from(r, st));
        }

        boolean canSubmitReview = false;
        ReviewItemResponse myReview = null;
        try {
            UserAccount u = authService.me(authorization);
            if ("student".equalsIgnoreCase(nullSafe(u.getRole()))) {
                Optional<PropertyReview> mine = propertyReviewRepository.findByPropertyIdAndStudentId(propertyId, u.getId());
                if (mine.isPresent()) {
                    myReview = ReviewItemResponse.from(mine.get(), u);
                } else {
                    Optional<Application> app = applicationRepository.findByPropertyIdAndStudentId(propertyId, u.getId());
                    canSubmitReview = app.isPresent() && "accepted".equalsIgnoreCase(nullSafe(app.get().getStatus()));
                }
            }
        } catch (IllegalArgumentException ignored) {
            /* not logged in or bad token */
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("canSubmitReview", canSubmitReview);
        body.put("myReview", myReview);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ReviewCreateRequest request
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        if (request == null || request.getPropertyId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "rating must be between 1 and 5"));
        }
        String comment = request.getComment() == null ? "" : request.getComment().trim();
        if (comment.length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please write at least 10 characters for your review."));
        }
        if (comment.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Review is too long."));
        }

        Optional<PropertyEntity> propOpt = propertyRepository.findById(request.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() != null && property.getLandlordId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You cannot review your own listing"));
        }

        Optional<Application> app = applicationRepository.findByPropertyIdAndStudentId(request.getPropertyId(), student.getId());
        if (app.isEmpty() || !"accepted".equalsIgnoreCase(nullSafe(app.get().getStatus()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only leave a review after the landlord has accepted your rental application for this property."
            ));
        }

        if (propertyReviewRepository.existsByPropertyIdAndStudentId(request.getPropertyId(), student.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "You have already reviewed this property"));
        }

        PropertyReview r = new PropertyReview();
        r.setPropertyId(request.getPropertyId());
        r.setStudentId(student.getId());
        r.setRating(request.getRating());
        r.setComment(comment);
        LocalDateTime now = LocalDateTime.now();
        r.setCreatedAt(now);
        PropertyReview saved = propertyReviewRepository.save(r);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", ReviewItemResponse.from(saved, student)));
    }

    @GetMapping({"/for-student", "/student"})
    public ResponseEntity<?> listForStudent(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        List<PropertyReview> rows = propertyReviewRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        List<ReviewItemResponse> items = new ArrayList<>();
        for (PropertyReview r : rows) {
            ReviewItemResponse item = ReviewItemResponse.from(r, student);
            PropertyEntity property = propertyRepository.findById(r.getPropertyId()).orElse(null);
            item.propertyName = property != null ? property.getName() : "Property #" + r.getPropertyId();
            items.add(item);
        }
        return ResponseEntity.ok(Map.of("items", items));
    }

    @GetMapping("/landlord")
    public ResponseEntity<?> listForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        List<PropertyEntity> properties = propertyRepository.findByLandlordIdOrderByUpdatedAtDesc(landlord.getId());
        List<Integer> propertyIds = new ArrayList<>();
        Map<Integer, String> propertyNames = new LinkedHashMap<>();
        for (PropertyEntity p : properties) {
            if (p.getId() != null) {
                propertyIds.add(p.getId());
                propertyNames.put(p.getId(), p.getName() != null ? p.getName() : "Property #" + p.getId());
            }
        }
        if (propertyIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("items", List.of(), "count", 0));
        }

        List<ReviewItemResponse> items = new ArrayList<>();
        for (PropertyReview r : propertyReviewRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds)) {
            UserAccount student = userAccountRepository.findById(r.getStudentId()).orElse(null);
            ReviewItemResponse item = ReviewItemResponse.from(r, student);
            item.propertyName = propertyNames.getOrDefault(r.getPropertyId(), "Property #" + r.getPropertyId());
            items.add(item);
        }

        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @PutMapping("/{reviewId}")
    @Transactional
    public ResponseEntity<?> update(
            @PathVariable("reviewId") Integer reviewId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ReviewCreateRequest request
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        if (reviewId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "reviewId is required"));
        }
        Optional<PropertyReview> rowOpt = propertyReviewRepository.findById(reviewId);
        if (rowOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Review not found"));
        }
        PropertyReview row = rowOpt.get();
        if (!student.getId().equals(row.getStudentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only edit your own reviews"));
        }

        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "rating must be between 1 and 5"));
        }
        String comment = request.getComment() == null ? "" : request.getComment().trim();
        if (comment.length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please write at least 10 characters for your review."));
        }
        if (comment.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Review is too long."));
        }

        row.setRating(request.getRating());
        row.setComment(comment);
        PropertyReview saved = propertyReviewRepository.save(row);
        ReviewItemResponse item = ReviewItemResponse.from(saved, student);
        PropertyEntity property = propertyRepository.findById(saved.getPropertyId()).orElse(null);
        item.propertyName = property != null ? property.getName() : "Property #" + saved.getPropertyId();
        return ResponseEntity.ok(Map.of("item", item));
    }

    @DeleteMapping("/{reviewId}")
    @Transactional
    public ResponseEntity<?> delete(
            @PathVariable("reviewId") Integer reviewId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        if (reviewId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "reviewId is required"));
        }
        Optional<PropertyReview> rowOpt = propertyReviewRepository.findById(reviewId);
        if (rowOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Review not found"));
        }
        PropertyReview row = rowOpt.get();
        if (!student.getId().equals(row.getStudentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only delete your own reviews"));
        }
        propertyReviewRepository.delete(row);
        return ResponseEntity.ok(Map.of("message", "Review deleted"));
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"landlord".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only landlord accounts can access this resource");
        }
        return u;
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"student".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only student accounts can submit reviews");
        }
        return u;
    }

    private static ResponseEntity<?> unauthorizedOrForbidden(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
