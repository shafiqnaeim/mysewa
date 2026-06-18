package com.mysewa.api.repo;

import com.mysewa.api.domain.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Integer> {

    Page<Application> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByPropertyId(Integer propertyId);

    List<Application> findByPropertyIdInOrderByCreatedAtDesc(Collection<Integer> propertyIds);

    List<Application> findByStudentIdOrderByCreatedAtDesc(Integer studentId);

    boolean existsByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    Optional<Application> findByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    long countByStatusIgnoreCase(String status);
}
