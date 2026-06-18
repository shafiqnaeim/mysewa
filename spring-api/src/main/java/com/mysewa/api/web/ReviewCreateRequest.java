package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * JSON body for {@code POST /api/v1/reviews}. Uses accessors so Jackson always binds reliably.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReviewCreateRequest {

    private Integer propertyId;
    private Integer rating;
    private String comment;

    public Integer getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(Integer propertyId) {
        this.propertyId = propertyId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
