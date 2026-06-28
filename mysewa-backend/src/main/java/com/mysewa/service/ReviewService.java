package com.mysewa.service;

import com.mysewa.dto.request.ReviewRequest;
import com.mysewa.dto.response.ReviewResponse;
import com.mysewa.enums.BookingStatus;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Booking;
import com.mysewa.model.Property;
import com.mysewa.model.Review;
import com.mysewa.model.User;
import com.mysewa.repository.BookingRepository;
import com.mysewa.repository.PropertyRepository;
import com.mysewa.repository.ReviewRepository;
import com.mysewa.util.SecurityUtil;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            PropertyRepository propertyRepository,
            BookingRepository bookingRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public ReviewResponse create(ReviewRequest request) {
        User student = requireStudent();
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));

        if (reviewRepository.existsByProperty_IdAndStudent_Id(property.getId(), student.getId())) {
            throw new BadRequestException("You have already reviewed this property");
        }

        Booking booking = bookingRepository.findByProperty_IdAndStudent_Id(property.getId(), student.getId())
                .orElseThrow(() -> new BadRequestException("You must have an accepted booking to review"));
        if (booking.getStatus() != BookingStatus.ACCEPTED) {
            throw new BadRequestException("You must have an accepted booking to review");
        }

        Review review = Review.builder()
                .property(property)
                .student(student)
                .rating(request.getRating())
                .reviewBody(request.getReviewBody().trim())
                .createdAt(LocalDateTime.now())
                .build();
        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listByProperty(Integer propertyId) {
        return reviewRepository.findByProperty_IdOrderByCreatedAtDesc(propertyId).stream()
                .map(ReviewResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listForStudent() {
        User student = requireStudent();
        return reviewRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .map(ReviewResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReviewResponse update(Integer id, ReviewRequest request) {
        User student = requireStudent();
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        if (!review.getStudent().getId().equals(student.getId())) {
            throw new UnauthorizedException("You can only update your own review");
        }
        review.setRating(request.getRating());
        review.setReviewBody(request.getReviewBody().trim());
        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional
    public void delete(Integer id) {
        User user = SecurityUtil.currentUser();
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        if (user.getRole() == Role.ADMIN) {
            reviewRepository.delete(review);
            return;
        }
        if (user.getRole() == Role.STUDENT && review.getStudent().getId().equals(user.getId())) {
            reviewRepository.delete(review);
            return;
        }
        throw new UnauthorizedException("Access denied");
    }

    private User requireStudent() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.STUDENT) {
            throw new UnauthorizedException("Student access required");
        }
        return user;
    }
}
