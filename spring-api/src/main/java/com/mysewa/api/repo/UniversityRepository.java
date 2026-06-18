package com.mysewa.api.repo;

import com.mysewa.api.domain.UniversityEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UniversityRepository extends JpaRepository<UniversityEntity, Integer> {

    Page<UniversityEntity> findAllByOrderBySortOrderAscCodeAsc(Pageable pageable);

    List<UniversityEntity> findByActiveTrueOrderBySortOrderAscCodeAsc();

    List<UniversityEntity> findAllByOrderBySortOrderAscCodeAsc();

    Optional<UniversityEntity> findByCodeIgnoreCase(String code);
}
