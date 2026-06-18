package com.mysewa.api.repo;

import com.mysewa.api.domain.PropertyReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Integer> {

    boolean existsByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    List<PropertyReview> findByPropertyIdOrderByCreatedAtDesc(Integer propertyId);

    Optional<PropertyReview> findByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    @Query("SELECT r.propertyId, AVG(r.rating), COUNT(r) FROM PropertyReview r WHERE r.propertyId IN :ids GROUP BY r.propertyId")
    List<Object[]> aggregateRatingsByPropertyIds(@Param("ids") Collection<Integer> ids);
}
