package com.mysewa.dto.request;

import com.mysewa.enums.PaymentType;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class PaymentRequest {

    @NotNull
    private Integer bookingId;

    @NotNull
    private BigDecimal amount;

    private PaymentType type;

    private String externalRef;
}
