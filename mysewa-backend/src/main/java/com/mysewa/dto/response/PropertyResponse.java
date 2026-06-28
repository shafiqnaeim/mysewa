package com.mysewa.dto.response;

import com.mysewa.model.Property;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PropertyResponse {
    private Integer id;
    private Integer landlordId;
    private String name;
    private String type;
    private String location;
    private String city;
    private String state;
    private BigDecimal price;
    private Integer capacity;
    private String description;
    private String amenities;
    private String images;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PropertyResponse from(Property property) {
        return PropertyResponse.builder()
                .id(property.getId())
                .landlordId(property.getLandlord() != null ? property.getLandlord().getId() : null)
                .name(property.getName())
                .type(property.getType())
                .location(property.getLocation())
                .city(property.getCity())
                .state(property.getState())
                .price(property.getPrice())
                .capacity(property.getCapacity())
                .description(property.getDescription())
                .amenities(property.getAmenities())
                .images(property.getImages())
                .status(property.getStatus())
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .build();
    }
}
