package com.mysewa.api.repo;

import com.mysewa.api.domain.FinancialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, Integer> {

    boolean existsByApplicationIdAndType(Integer applicationId, String type);

    List<FinancialTransaction> findByApplicationIdInAndType(Collection<Integer> applicationIds, String type);

    List<FinancialTransaction> findByApplicationIdOrderByCreatedAtDesc(Integer applicationId);

    List<FinancialTransaction> findByStudentIdOrderByCreatedAtDesc(Integer studentId);

    List<FinancialTransaction> findByPropertyIdInOrderByCreatedAtDesc(Collection<Integer> propertyIds);

    @Query("SELECT COUNT(t) > 0 FROM FinancialTransaction t WHERE t.applicationId = :applicationId AND t.status = 'completed' AND t.type IN ('deposit_mock','deposit_bank','deposit_qr','deposit_cash','deposit_toyyibpay','deposit_landlord_marked')")
    boolean hasCompletedDeposit(@Param("applicationId") Integer applicationId);

    @Query("SELECT DISTINCT t.applicationId FROM FinancialTransaction t WHERE t.applicationId IN :ids AND t.status = 'completed' AND t.type IN ('deposit_mock','deposit_bank','deposit_qr','deposit_cash','deposit_toyyibpay','deposit_landlord_marked')")
    List<Integer> findApplicationIdsWithCompletedDeposit(@Param("ids") Collection<Integer> ids);

    Optional<FinancialTransaction> findTopByApplicationIdAndTypeAndStatusOrderByCreatedAtDesc(
            Integer applicationId,
            String type,
            String status
    );

    Optional<FinancialTransaction> findByExternalRefAndTypeAndStatus(String externalRef, String type, String status);

    List<FinancialTransaction> findAllByOrderByCreatedAtDesc();

    /** Removes all prototype deposit rows for an application (completed + pending ToyyibPay). For local QA only. */
    long deleteByApplicationIdAndTypeIn(Integer applicationId, Collection<String> types);
}
