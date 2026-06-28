package com.mysewa.dto.request;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PropertyRequest {

    private String name;
    private String type;
    private String location;
    private String city;
    private String state;
    private String rentalStyle;
    private Boolean acceptsMarriedHousehold;
    private BigDecimal price;
    private Integer capacity;
    private String description;
    private String amenities;
    private String status;
}
