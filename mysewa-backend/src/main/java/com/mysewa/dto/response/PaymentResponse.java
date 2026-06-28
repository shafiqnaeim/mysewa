package com.mysewa.dto.response;

import com.mysewa.enums.PaymentStatus;
import com.mysewa.enums.PaymentType;
import com.mysewa.model.Payment;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentResponse {
    private Integer id;
    private Integer bookingId;
    private Integer studentId;
    private Integer propertyId;
    private BigDecimal amount;
    private String currency;
    private PaymentType type;
    private PaymentStatus status;
    private String externalRef;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .bookingId(payment.getApplication() != null ? payment.getApplication().getId() : null)
                .studentId(payment.getStudent() != null ? payment.getStudent().getId() : null)
                .propertyId(payment.getProperty() != null ? payment.getProperty().getId() : null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .type(payment.getType())
                .status(payment.getStatus())
                .externalRef(payment.getExternalRef())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
