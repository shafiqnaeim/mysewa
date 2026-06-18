package com.mysewa.api.repo;

import com.mysewa.api.domain.PropertyTenantReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyTenantReportRepository extends JpaRepository<PropertyTenantReport, Integer> {

    List<PropertyTenantReport> findByPropertyIdOrderByCreatedAtDesc(Integer propertyId);

    List<PropertyTenantReport> findByPropertyIdAndStudentIdOrderByCreatedAtDesc(Integer propertyId, Integer studentId);

    Optional<PropertyTenantReport> findByIdAndPropertyId(Integer id, Integer propertyId);
}
