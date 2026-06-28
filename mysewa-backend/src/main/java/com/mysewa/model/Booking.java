package com.mysewa.model;

import com.mysewa.enums.BookingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "applications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_applications_property_student",
                columnNames = {"property_id", "student_id"}
        )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "preferred_move_in", length = 100)
    private String preferredMoveIn;

    @Column(name = "lease_end", length = 32)
    private String leaseEnd;

    @Column(name = "lease_days")
    private Integer leaseDays;

    @Column(name = "lease_months")
    @Builder.Default
    private Integer leaseMonths = 12;

    @Column(name = "landlord_deposit_amount", precision = 12, scale = 2)
    private BigDecimal landlordDepositAmount;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
