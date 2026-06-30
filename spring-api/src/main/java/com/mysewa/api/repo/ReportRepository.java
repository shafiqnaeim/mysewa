package com.mysewa.api.repo;

import com.mysewa.api.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Integer> {

    List<Report> findByStudentIdOrderBySubmittedAtDesc(Integer studentId);

    List<Report> findByPropertyIdInOrderBySubmittedAtDesc(Collection<Integer> propertyIds);

    List<Report> findByPropertyIdInAndStatusOrderBySubmittedAtDesc(Collection<Integer> propertyIds, String status);

    Optional<Report> findByIdAndPropertyId(Integer id, Integer propertyId);

    Optional<Report> findByIdAndStudentId(Integer id, Integer studentId);
}
