package com.mysewa.repository;

import com.mysewa.enums.BookingStatus;
import com.mysewa.model.Booking;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByProperty_Id(Integer propertyId);

    List<Booking> findByProperty_IdInOrderByCreatedAtDesc(Collection<Integer> propertyIds);

    List<Booking> findByStudent_IdOrderByCreatedAtDesc(Integer studentId);

    boolean existsByProperty_IdAndStudent_Id(Integer propertyId, Integer studentId);

    Optional<Booking> findByProperty_IdAndStudent_Id(Integer propertyId, Integer studentId);

    long countByStatus(BookingStatus status);
}
