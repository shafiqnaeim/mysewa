package com.mysewa.api.repo;

import com.mysewa.api.domain.SavedProperty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedPropertyRepository extends JpaRepository<SavedProperty, Integer> {

    List<SavedProperty> findByStudentIdOrderByCreatedAtDesc(Integer studentId);

    Optional<SavedProperty> findByStudentIdAndPropertyId(Integer studentId, Integer propertyId);

    void deleteByStudentIdAndPropertyId(Integer studentId, Integer propertyId);

    boolean existsByStudentIdAndPropertyId(Integer studentId, Integer propertyId);
}
