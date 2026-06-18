package com.mysewa.api.domain;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Access;
import javax.persistence.AccessType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Student rental application for a property. Table {@code applications}.
 * Move-in: {@code preferred_move_in}; move-out (last day of tenancy): {@code lease_end} (ISO yyyy-MM-dd).
 */
@Entity
@Access(AccessType.FIELD)
@Table(
        name = "applications",
        uniqueConstraints = @UniqueConstraint(name = "uk_applications_property_student", columnNames = {"property_id", "student_id"})
)
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "property_id", nullable = false)
    private Integer propertyId;

    @Column(name = "student_id", nullable = false)
    private Integer studentId;

    @Column(name = "preferred_move_in", length = 100)
    private String preferredMoveIn;

    /** Requested tenancy length in months (1–120). */
    @Column(name = "lease_months")
    private Integer leaseMonths = 12;

    /** Last day of tenancy, ISO yyyy-MM-dd (aligned with preferred_move_in). */
    @Column(name = "lease_end", length = 32)
    private String leaseEnd;

    /** Day span ChronoUnit.DAYS.between(move-in, lease-end); matches the apply-calendar UI. */
    @Column(name = "lease_days")
    private Integer leaseDays;

    /** Deposit in MYR set by the landlord when accepting (student payment flows use this when present). */
    @Column(name = "landlord_deposit_amount", precision = 12, scale = 2)
    private BigDecimal landlordDepositAmount;

    @Column(nullable = false, length = 32)
    private String status = "pending";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(Integer propertyId) {
        this.propertyId = propertyId;
    }

    public Integer getStudentId() {
        return studentId;
    }

    public void setStudentId(Integer studentId) {
        this.studentId = studentId;
    }

    public String getPreferredMoveIn() {
        return preferredMoveIn;
    }

    public void setPreferredMoveIn(String preferredMoveIn) {
        this.preferredMoveIn = preferredMoveIn;
    }

    public Integer getLeaseMonths() {
        return leaseMonths;
    }

    public void setLeaseMonths(Integer leaseMonths) {
        this.leaseMonths = leaseMonths;
    }

    public String getLeaseEnd() {
        return leaseEnd;
    }

    public void setLeaseEnd(String leaseEnd) {
        this.leaseEnd = leaseEnd;
    }

    public Integer getLeaseDays() {
        return leaseDays;
    }

    public void setLeaseDays(Integer leaseDays) {
        this.leaseDays = leaseDays;
    }

    public BigDecimal getLandlordDepositAmount() {
        return landlordDepositAmount;
    }

    public void setLandlordDepositAmount(BigDecimal landlordDepositAmount) {
        this.landlordDepositAmount = landlordDepositAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
