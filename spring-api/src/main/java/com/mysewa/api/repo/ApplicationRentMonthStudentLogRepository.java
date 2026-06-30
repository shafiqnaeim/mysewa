package com.mysewa.api.repo;

import com.mysewa.api.domain.ApplicationRentMonthStudentLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRentMonthStudentLogRepository extends JpaRepository<ApplicationRentMonthStudentLog, Integer> {

    List<ApplicationRentMonthStudentLog> findByApplicationIdAndRentYearOrderByRentMonthAsc(Integer applicationId, Integer rentYear);

    List<ApplicationRentMonthStudentLog> findByApplicationIdOrderByRentYearAscRentMonthAsc(Integer applicationId);

    Optional<ApplicationRentMonthStudentLog> findByApplicationIdAndRentYearAndRentMonth(
            Integer applicationId,
            Integer rentYear,
            Integer rentMonth
    );
}
