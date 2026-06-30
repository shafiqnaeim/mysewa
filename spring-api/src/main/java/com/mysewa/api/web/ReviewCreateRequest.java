package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ReviewCreateRequest {

    private Integer propertyId;
    private Integer bookingId;
    private Integer rating;
    private Integer ratingOverall;
    private Integer ratingCleanliness;
    private Integer ratingCondition;
    private Integer ratingAmenities;
    private Integer ratingLandlord;
    private Integer ratingLocation;
    private Integer ratingValue;
    private String comment;
    private String publicComment;
    private Map<String, String> categoryComments;
    private List<String> photos;
    private Boolean anonymous;

    public Integer getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(Integer propertyId) {
        this.propertyId = propertyId;
    }

    public Integer getBookingId() {
        return bookingId;
    }

    public void setBookingId(Integer bookingId) {
        this.bookingId = bookingId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public Integer getRatingOverall() {
        return ratingOverall;
    }

    public void setRatingOverall(Integer ratingOverall) {
        this.ratingOverall = ratingOverall;
    }

    public Integer getRatingCleanliness() {
        return ratingCleanliness;
    }

    public void setRatingCleanliness(Integer ratingCleanliness) {
        this.ratingCleanliness = ratingCleanliness;
    }

    public Integer getRatingCondition() {
        return ratingCondition;
    }

    public void setRatingCondition(Integer ratingCondition) {
        this.ratingCondition = ratingCondition;
    }

    public Integer getRatingAmenities() {
        return ratingAmenities;
    }

    public void setRatingAmenities(Integer ratingAmenities) {
        this.ratingAmenities = ratingAmenities;
    }

    public Integer getRatingLandlord() {
        return ratingLandlord;
    }

    public void setRatingLandlord(Integer ratingLandlord) {
        this.ratingLandlord = ratingLandlord;
    }

    public Integer getRatingLocation() {
        return ratingLocation;
    }

    public void setRatingLocation(Integer ratingLocation) {
        this.ratingLocation = ratingLocation;
    }

    public Integer getRatingValue() {
        return ratingValue;
    }

    public void setRatingValue(Integer ratingValue) {
        this.ratingValue = ratingValue;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getPublicComment() {
        return publicComment;
    }

    public void setPublicComment(String publicComment) {
        this.publicComment = publicComment;
    }

    public Map<String, String> getCategoryComments() {
        return categoryComments;
    }

    public void setCategoryComments(Map<String, String> categoryComments) {
        this.categoryComments = categoryComments;
    }

    public List<String> getPhotos() {
        return photos;
    }

    public void setPhotos(List<String> photos) {
        this.photos = photos;
    }

    public Boolean getAnonymous() {
        return anonymous;
    }

    public void setAnonymous(Boolean anonymous) {
        this.anonymous = anonymous;
    }
}
