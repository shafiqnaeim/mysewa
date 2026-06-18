package com.mysewa.api.web;

import com.mysewa.api.domain.UniversityEntity;

public class UniversityResponse {

    private Integer id;
    private String code;
    private String name;
    private Double latitude;
    private Double longitude;
    private String city;
    private String state;
    private String postcode;
    private boolean active;
    private Integer sortOrder;
    private boolean pinned;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public static UniversityResponse fromEntity(UniversityEntity e) {
        UniversityResponse dto = new UniversityResponse();
        dto.setId(e.getId());
        dto.setCode(e.getCode());
        dto.setName(e.getName());
        dto.setLatitude(e.getLatitude());
        dto.setLongitude(e.getLongitude());
        dto.setCity(e.getCity());
        dto.setState(e.getState());
        dto.setPostcode(e.getPostcode());
        dto.setActive(Boolean.TRUE.equals(e.getActive()));
        dto.setSortOrder(e.getSortOrder());
        dto.setPinned(e.getLatitude() != null && e.getLongitude() != null);
        return dto;
    }
}
