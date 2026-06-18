package com.mysewa.api.web;

import com.mysewa.api.domain.PropertyEntity;

/**
 * Narrow JSON payload for listing cards — expand as migration grows.
 */
public class PropertyResponse {

    private Integer id;
    private Integer landlordId;
    private String name;
    private String type;
    private String location;
    private String campus;
    private String distance;
    private Double latitude;
    private Double longitude;
    private String city;
    private String state;
    private String postcode;
    private Double price;
    private Integer capacity;
    private String description;
    private String amenities;
    private String images;
    private String rentalStyle;
    private boolean acceptsMarriedHousehold;
    private String gender;
    private String religion;
    private String race;
    private String thumbnailPath;
    private String status;

    private Double averageRating;
    private Long reviewCount;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getLandlordId() {
        return landlordId;
    }

    public void setLandlordId(Integer landlordId) {
        this.landlordId = landlordId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public String getDistance() {
        return distance;
    }

    public void setDistance(String distance) {
        this.distance = distance;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostcode() {
        return postcode;
    }

    public void setPostcode(String postcode) {
        this.postcode = postcode;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAmenities() {
        return amenities;
    }

    public void setAmenities(String amenities) {
        this.amenities = amenities;
    }

    public String getImages() {
        return images;
    }

    public void setImages(String images) {
        this.images = images;
    }

    public String getRentalStyle() {
        return rentalStyle;
    }

    public void setRentalStyle(String rentalStyle) {
        this.rentalStyle = rentalStyle;
    }

    public boolean isAcceptsMarriedHousehold() {
        return acceptsMarriedHousehold;
    }

    public void setAcceptsMarriedHousehold(boolean acceptsMarriedHousehold) {
        this.acceptsMarriedHousehold = acceptsMarriedHousehold;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getReligion() {
        return religion;
    }

    public void setReligion(String religion) {
        this.religion = religion;
    }

    public String getRace() {
        return race;
    }

    public void setRace(String race) {
        this.race = race;
    }

    public String getThumbnailPath() {
        return thumbnailPath;
    }

    public void setThumbnailPath(String thumbnailPath) {
        this.thumbnailPath = thumbnailPath;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
        this.reviewCount = reviewCount;
    }

    static PropertyResponse fromEntity(PropertyEntity e) {
        PropertyResponse dto = new PropertyResponse();
        dto.setId(e.getId());
        dto.setLandlordId(e.getLandlordId());
        dto.setName(e.getName());
        dto.setType(e.getType());
        dto.setLocation(e.getLocation());
        dto.setCampus(e.getCampus());
        dto.setDistance(e.getDistance());
        dto.setLatitude(e.getLatitude());
        dto.setLongitude(e.getLongitude());
        dto.setCity(e.getCity());
        dto.setState(e.getState());
        dto.setPostcode(e.getPostcode());
        dto.setPrice(e.getPrice());
        dto.setCapacity(e.getCapacity());
        dto.setDescription(e.getDescription());
        dto.setAmenities(e.getAmenities());
        dto.setImages(e.getImages());
        dto.setRentalStyle(e.getRentalStyle() != null ? e.getRentalStyle() : "");
        dto.setAcceptsMarriedHousehold(Boolean.TRUE.equals(e.getAcceptsMarriedHousehold()));
        dto.setGender(e.getGender());
        dto.setReligion(e.getReligion());
        dto.setRace(e.getRace());
        dto.setStatus(e.getStatus());
        dto.setThumbnailPath(firstImagePath(e.getImages()));
        return dto;
    }

    /**
     * {@code images} column is Gson JSON array of strings; servlet returns first path as listing thumb.
     */
    private static String firstImagePath(String imagesJson) {
        if (imagesJson == null || imagesJson.trim().isEmpty()) {
            return null;
        }
        String trimmed = imagesJson.trim();
        if (!trimmed.startsWith("[")) {
            return null;
        }
        int startQuote = trimmed.indexOf('"');
        if (startQuote < 0) {
            return null;
        }
        int endQuote = trimmed.indexOf('"', startQuote + 1);
        if (endQuote <= startQuote) {
            return null;
        }
        return trimmed.substring(startQuote + 1, endQuote);
    }
}
