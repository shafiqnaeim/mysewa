package com.mysewa.dto.response;

import com.mysewa.enums.BookingStatus;
import com.mysewa.model.Booking;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingResponse {
    private Integer id;
    private Integer propertyId;
    private String propertyName;
    private Integer studentId;
    private String studentName;
    private String preferredMoveIn;
    private String leaseEnd;
    private Integer leaseDays;
    private Integer leaseMonths;
    private BigDecimal landlordDepositAmount;
    private BookingStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BookingResponse from(Booking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .propertyId(booking.getProperty() != null ? booking.getProperty().getId() : null)
                .propertyName(booking.getProperty() != null ? booking.getProperty().getName() : null)
                .studentId(booking.getStudent() != null ? booking.getStudent().getId() : null)
                .studentName(booking.getStudent() != null ? booking.getStudent().getFullName() : null)
                .preferredMoveIn(booking.getPreferredMoveIn())
                .leaseEnd(booking.getLeaseEnd())
                .leaseDays(booking.getLeaseDays())
                .leaseMonths(booking.getLeaseMonths())
                .landlordDepositAmount(booking.getLandlordDepositAmount())
                .status(booking.getStatus())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}
