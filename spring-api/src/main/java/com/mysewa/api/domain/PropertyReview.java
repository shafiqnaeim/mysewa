package com.mysewa.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "property_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uk_property_reviews_property_student", columnNames = {"property_id", "student_id"})
)
public class PropertyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "booking_id")
    private Integer bookingId;

    @Column(name = "property_id", nullable = false)
    private Integer propertyId;

    @Column(name = "student_id", nullable = false)
    private Integer studentId;

    @Column(name = "rating_cleanliness", nullable = false)
    private int ratingCleanliness;

    @Column(name = "rating_condition", nullable = false)
    private int ratingCondition;

    @Column(name = "rating_amenities", nullable = false)
    private int ratingAmenities;

    @Column(name = "rating_landlord", nullable = false)
    private int ratingLandlord;

    @Column(name = "rating_location", nullable = false)
    private int ratingLocation;

    @Column(name = "rating_value", nullable = false)
    private int ratingValue;

    @Column(name = "rating_overall", nullable = false)
    private int ratingOverall;

    /** JSON map of category key → short comment. */
    @Column(name = "category_comments", columnDefinition = "JSON")
    private String categoryComments;

    @Column(name = "public_comment", columnDefinition = "TEXT")
    private String publicComment;

    /** JSON array of image URL strings. */
    @Column(columnDefinition = "JSON")
    private String photos;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getBookingId() {
        return bookingId;
    }

    public void setBookingId(Integer bookingId) {
        this.bookingId = bookingId;
    }

    public Integer getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(Integer propertyId) {
        this.propertyId = propertyId;
    }

    public Integer getStudentId() {
        return studentId;
    }

    public void setStudentId(Integer studentId) {
        this.studentId = studentId;
    }

    public int getRatingCleanliness() {
        return ratingCleanliness;
    }

    public void setRatingCleanliness(int ratingCleanliness) {
        this.ratingCleanliness = ratingCleanliness;
    }

    public int getRatingCondition() {
        return ratingCondition;
    }

    public void setRatingCondition(int ratingCondition) {
        this.ratingCondition = ratingCondition;
    }

    public int getRatingAmenities() {
        return ratingAmenities;
    }

    public void setRatingAmenities(int ratingAmenities) {
        this.ratingAmenities = ratingAmenities;
    }

    public int getRatingLandlord() {
        return ratingLandlord;
    }

    public void setRatingLandlord(int ratingLandlord) {
        this.ratingLandlord = ratingLandlord;
    }

    public int getRatingLocation() {
        return ratingLocation;
    }

    public void setRatingLocation(int ratingLocation) {
        this.ratingLocation = ratingLocation;
    }

    public int getRatingValue() {
        return ratingValue;
    }

    public void setRatingValue(int ratingValue) {
        this.ratingValue = ratingValue;
    }

    public int getRatingOverall() {
        return ratingOverall;
    }

    public void setRatingOverall(int ratingOverall) {
        this.ratingOverall = ratingOverall;
    }

    public String getCategoryComments() {
        return categoryComments;
    }

    public void setCategoryComments(String categoryComments) {
        this.categoryComments = categoryComments;
    }

    public String getPublicComment() {
        return publicComment;
    }

    public void setPublicComment(String publicComment) {
        this.publicComment = publicComment;
    }

    public String getPhotos() {
        return photos;
    }

    public void setPhotos(String photos) {
        this.photos = photos;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /** @deprecated use {@link #getRatingOverall()} */
    public int getRating() {
        return ratingOverall;
    }

    /** @deprecated use {@link #setRatingOverall(int)} */
    public void setRating(int rating) {
        this.ratingOverall = rating;
    }

    /** @deprecated use {@link #getPublicComment()} */
    public String getComment() {
        return publicComment;
    }

    /** @deprecated use {@link #setPublicComment(String)} */
    public void setComment(String comment) {
        this.publicComment = comment;
    }
}
