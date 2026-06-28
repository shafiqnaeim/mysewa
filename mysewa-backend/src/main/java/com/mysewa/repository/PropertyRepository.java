package com.mysewa.repository;

import com.mysewa.model.Property;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyRepository extends JpaRepository<Property, Integer> {

    Page<Property> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<Property> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Property> findByLandlord_IdOrderByUpdatedAtDesc(Integer landlordId);
}
