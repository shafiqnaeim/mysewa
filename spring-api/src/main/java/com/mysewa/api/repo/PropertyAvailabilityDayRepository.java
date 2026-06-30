package com.mysewa.api.repo;

import com.mysewa.api.domain.PropertyAvailabilityDay;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyAvailabilityDayRepository extends JpaRepository<PropertyAvailabilityDay, Integer> {

    List<PropertyAvailabilityDay> findByPropertyIdAndAvailabilityDateBetweenOrderByAvailabilityDateAsc(
            Integer propertyId,
            LocalDate from,
            LocalDate to
    );

    long deleteByApplicationId(Integer applicationId);

    boolean existsByApplicationId(Integer applicationId);

    long countByPropertyIdAndAvailabilityDateGreaterThanEqual(Integer propertyId, LocalDate from);
}
