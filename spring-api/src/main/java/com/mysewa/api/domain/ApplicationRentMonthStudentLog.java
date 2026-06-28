package com.mysewa.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * Student-only note that they sent rent for a month (tracking); does not replace landlord "paid" on the ledger.
 */
@Entity
@Table(
        name = "application_rent_month_student_logs",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_student_rent_log_app_ym",
                columnNames = {"application_id", "rent_year", "rent_month"}
        )
)
public class ApplicationRentMonthStudentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "application_id", nullable = false)
    private Integer applicationId;

    @Column(name = "rent_year", nullable = false)
    private Integer rentYear;

    @Column(name = "rent_month", nullable = false)
    private Integer rentMonth;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @Column(name = "payment_method", length = 32)
    private String paymentMethod;

    @Column(name = "receipt_url", length = 1024)
    private String receiptUrl;

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

    public LocalDateTime getLoggedAt() {
        return loggedAt;
    }

    public void setLoggedAt(LocalDateTime loggedAt) {
        this.loggedAt = loggedAt;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getReceiptUrl() {
        return receiptUrl;
    }

    public void setReceiptUrl(String receiptUrl) {
        this.receiptUrl = receiptUrl;
    }
}
