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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@RequestMapping("/api/v1/reviews")
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

    @GetMapping("/for-property/{propertyId}")
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
