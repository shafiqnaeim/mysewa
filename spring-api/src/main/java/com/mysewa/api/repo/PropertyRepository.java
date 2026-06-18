package com.mysewa.api.repo;

import com.mysewa.api.domain.PropertyEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyRepository extends JpaRepository<PropertyEntity, Integer> {

    Page<PropertyEntity> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<PropertyEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<PropertyEntity> findByLandlordIdOrderByUpdatedAtDesc(Integer landlordId);
}
