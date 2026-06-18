package com.mysewa.api.repo;

import com.mysewa.api.domain.ApplicationRentMonthRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRentMonthRecordRepository extends JpaRepository<ApplicationRentMonthRecord, Integer> {

    List<ApplicationRentMonthRecord> findByApplicationIdAndRentYearOrderByRentMonthAsc(Integer applicationId, Integer rentYear);

    Optional<ApplicationRentMonthRecord> findByApplicationIdAndRentYearAndRentMonth(Integer applicationId, Integer rentYear, Integer rentMonth);

    long deleteByApplicationId(Integer applicationId);
}
