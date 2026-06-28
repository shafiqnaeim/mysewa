package com.mysewa.dto.request;

import com.mysewa.enums.BookingStatus;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class BookingStatusUpdateRequest {
    private BookingStatus status;
    private BigDecimal depositAmount;
}
