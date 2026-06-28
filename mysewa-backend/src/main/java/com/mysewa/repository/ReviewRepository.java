package com.mysewa.repository;

import com.mysewa.model.Review;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    boolean existsByProperty_IdAndStudent_Id(Integer propertyId, Integer studentId);

    List<Review> findByProperty_IdOrderByCreatedAtDesc(Integer propertyId);

    Optional<Review> findByProperty_IdAndStudent_Id(Integer propertyId, Integer studentId);

    List<Review> findByStudent_IdOrderByCreatedAtDesc(Integer studentId);

    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT r.property.id, AVG(r.rating), COUNT(r)
            FROM Review r
            WHERE r.property.id IN :ids
            GROUP BY r.property.id
            """)
    List<Object[]> aggregateRatingsByPropertyIds(@Param("ids") Collection<Integer> ids);
}
