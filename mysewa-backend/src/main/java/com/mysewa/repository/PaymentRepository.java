package com.mysewa.repository;

import com.mysewa.enums.PaymentStatus;
import com.mysewa.enums.PaymentType;
import com.mysewa.model.Payment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    boolean existsByApplication_IdAndType(Integer applicationId, PaymentType type);

    List<Payment> findByApplication_IdInAndType(Collection<Integer> applicationIds, PaymentType type);

    List<Payment> findByApplication_IdOrderByCreatedAtDesc(Integer applicationId);

    List<Payment> findByStudent_IdOrderByCreatedAtDesc(Integer studentId);

    @Query("""
            SELECT COUNT(p) > 0 FROM Payment p
            WHERE p.application.id = :applicationId
              AND p.status = com.mysewa.enums.PaymentStatus.COMPLETED
              AND p.type = com.mysewa.enums.PaymentType.DEPOSIT
            """)
    boolean hasCompletedDeposit(@Param("applicationId") Integer applicationId);

    @Query("""
            SELECT DISTINCT p.application.id FROM Payment p
            WHERE p.application.id IN :ids
              AND p.status = com.mysewa.enums.PaymentStatus.COMPLETED
              AND p.type = com.mysewa.enums.PaymentType.DEPOSIT
            """)
    List<Integer> findApplicationIdsWithCompletedDeposit(@Param("ids") Collection<Integer> ids);

    Optional<Payment> findTopByApplication_IdAndTypeAndStatusOrderByCreatedAtDesc(
            Integer applicationId,
            PaymentType type,
            PaymentStatus status
    );

    Optional<Payment> findByExternalRefAndTypeAndStatus(
            String externalRef,
            PaymentType type,
            PaymentStatus status
    );

    List<Payment> findAllByOrderByCreatedAtDesc();

    long deleteByApplication_IdAndTypeIn(Integer applicationId, Collection<PaymentType> types);
}
