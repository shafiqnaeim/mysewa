package com.mysewa.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingRequest {

    @NotNull
    private Integer propertyId;

    private String preferredMoveIn;

    private String leaseEnd;

    private Integer leaseDays;

    private Integer leaseMonths;
}
