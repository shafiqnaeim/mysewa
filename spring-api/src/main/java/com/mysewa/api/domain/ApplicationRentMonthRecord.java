package com.mysewa.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Landlord-marked monthly rent payment for an accepted application (prototype).
 */
@Entity
@Table(
        name = "application_rent_month_records",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_rent_month_app_ym",
                columnNames = {"application_id", "rent_year", "rent_month"}
        )
)
public class ApplicationRentMonthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "application_id", nullable = false)
    private Integer applicationId;

    @Column(name = "rent_year", nullable = false)
    private Integer rentYear;

    @Column(name = "rent_month", nullable = false)
    private Integer rentMonth;

    /** MYR amount the landlord recorded for this month’s rent (prototype). */
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    /** How the student is expected to pay (e.g. bank_transfer, duitnow_qr). */
    @Column(name = "payment_channel", length = 64)
    private String paymentChannel;

    /**
     * {@code received} = rent recorded as paid; {@code unavailable} = special case, no rent expected this month.
     */
    @Column(name = "month_state", nullable = false, length = 24)
    private String monthState = "received";

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Integer applicationId) {
        this.applicationId = applicationId;
    }

    public Integer getRentYear() {
        return rentYear;
    }

    public void setRentYear(Integer rentYear) {
        this.rentYear = rentYear;
    }

    public Integer getRentMonth() {
        return rentMonth;
    }

    public void setRentMonth(Integer rentMonth) {
        this.rentMonth = rentMonth;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentChannel() {
        return paymentChannel;
    }

    public void setPaymentChannel(String paymentChannel) {
        this.paymentChannel = paymentChannel;
    }

    public String getMonthState() {
        return monthState;
    }

    public void setMonthState(String monthState) {
        this.monthState = monthState;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
