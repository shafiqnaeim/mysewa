package com.mysewa.dto.response;

import com.mysewa.model.Review;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {
    private Integer id;
    private Integer propertyId;
    private Integer studentId;
    private String studentName;
    private Integer rating;
    private String reviewBody;
    private LocalDateTime createdAt;

    public static ReviewResponse from(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .propertyId(review.getProperty() != null ? review.getProperty().getId() : null)
                .studentId(review.getStudent() != null ? review.getStudent().getId() : null)
                .studentName(review.getStudent() != null ? review.getStudent().getFullName() : null)
                .rating(review.getRating())
                .reviewBody(review.getReviewBody())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
