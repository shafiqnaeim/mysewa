package com.mysewa.controller;

import com.mysewa.dto.request.ReviewRequest;
import com.mysewa.dto.response.ReviewResponse;
import com.mysewa.service.ReviewService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, ReviewResponse>> create(@Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", reviewService.create(request)));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<Map<String, List<ReviewResponse>>> listByProperty(@PathVariable Integer propertyId) {
        return ResponseEntity.ok(Map.of("items", reviewService.listByProperty(propertyId)));
    }

    @GetMapping("/student")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, List<ReviewResponse>>> listForStudent() {
        return ResponseEntity.ok(Map.of("items", reviewService.listForStudent()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, ReviewResponse>> update(
            @PathVariable Integer id,
            @Valid @RequestBody ReviewRequest request
    ) {
        return ResponseEntity.ok(Map.of("item", reviewService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        reviewService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Review deleted"));
    }
}
