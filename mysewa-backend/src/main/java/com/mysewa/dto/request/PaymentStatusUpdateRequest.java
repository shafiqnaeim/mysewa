package com.mysewa.dto.request;

import com.mysewa.enums.PaymentStatus;
import lombok.Data;

@Data
public class PaymentStatusUpdateRequest {
    private PaymentStatus status;
}
