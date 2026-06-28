package com.mysewa.repository;

import com.mysewa.model.SavedProperty;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedPropertyRepository extends JpaRepository<SavedProperty, Integer> {

    List<SavedProperty> findByStudent_IdOrderByCreatedAtDesc(Integer studentId);

    Optional<SavedProperty> findByStudent_IdAndProperty_Id(Integer studentId, Integer propertyId);

    void deleteByStudent_IdAndProperty_Id(Integer studentId, Integer propertyId);

    boolean existsByStudent_IdAndProperty_Id(Integer studentId, Integer propertyId);
}
