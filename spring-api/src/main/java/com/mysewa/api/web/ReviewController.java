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
import com.mysewa.api.service.ReviewService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
    private final ReviewService reviewService;

    public ReviewController(
            PropertyReviewRepository propertyReviewRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UserAccountRepository userAccountRepository,
            AuthService authService,
            ReviewService reviewService
    ) {
        this.propertyReviewRepository = propertyReviewRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.userAccountRepository = userAccountRepository;
        this.authService = authService;
        this.reviewService = reviewService;
    }

    @GetMapping("/average")
    public ResponseEntity<Map<String, Object>> averageRating() {
        Double avg = propertyReviewRepository.averageOverallRating();
        long reviewCount = propertyReviewRepository.count();
        Map<String, Object> body = new LinkedHashMap<>();
        if (avg != null) {
            body.put("average", Math.round(avg * 10.0) / 10.0);
        } else {
            body.put("average", null);
        }
        body.put("count", reviewCount);
        return ResponseEntity.ok(body);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listRecent(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "10") int limit
    ) {
        int capped = Math.min(Math.max(limit, 1), 50);
        Page<PropertyReview> page = propertyReviewRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, capped)
        );
        List<ReviewItemResponse> items = new ArrayList<>();
        for (PropertyReview r : page.getContent()) {
            UserAccount student = userAccountRepository.findById(r.getStudentId()).orElse(null);
            ReviewItemResponse item = ReviewItemResponse.from(r, student);
            if (r.getPropertyId() != null) {
                propertyRepository.findById(r.getPropertyId())
                        .ifPresent(p -> item.propertyName = p.getName());
            }
            items.add(item);
        }
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
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

        List<PropertyReview> rows;
        try {
            rows = propertyReviewRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId);
        } catch (Exception ex) {
            rows = List.of();
        }
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
                    canSubmitReview = reviewService.canStudentSubmitReview(propertyId, u.getId());
                }
            }
        } catch (IllegalArgumentException ignored) {
            /* not logged in or bad token */
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("aggregates", reviewService.aggregatesForProperty(propertyId));
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

        try {
            PropertyReview saved = reviewService.createReview(student, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Review submitted successfully.",
                    "item", ReviewItemResponse.from(saved, student)
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Unable to submit review";
            HttpStatus status = "Property not found".equals(msg) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", msg));
        }
    }

    @PostMapping(value = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhotos(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestPart("images") MultipartFile[] images
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        try {
            List<String> files = reviewService.uploadReviewPhotos(student, images);
            return ResponseEntity.ok(Map.of("files", files, "count", files.size()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message",
                    ex.getMessage() != null ? ex.getMessage() : "Photo upload failed"
            ));
        }
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
        List<PropertyReview> rows;
        try {
            rows = propertyReviewRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds);
        } catch (Exception ex) {
            rows = List.of();
        }
        for (PropertyReview r : rows) {
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
        try {
            PropertyReview saved = reviewService.updateReview(student, reviewId, request);
            ReviewItemResponse item = ReviewItemResponse.from(saved, student);
            PropertyEntity property = propertyRepository.findById(saved.getPropertyId()).orElse(null);
            item.propertyName = property != null ? property.getName() : "Property #" + saved.getPropertyId();
            return ResponseEntity.ok(Map.of("item", item));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Unable to update review";
            HttpStatus status = "Review not found".equals(msg) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", msg));
        }
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
