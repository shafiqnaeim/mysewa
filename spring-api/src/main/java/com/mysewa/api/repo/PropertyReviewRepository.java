package com.mysewa.api.repo;

import com.mysewa.api.domain.PropertyReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Integer> {

    boolean existsByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    List<PropertyReview> findByPropertyIdOrderByCreatedAtDesc(Integer propertyId);

    List<PropertyReview> findByPropertyIdInOrderByCreatedAtDesc(Collection<Integer> propertyIds);

    Optional<PropertyReview> findByPropertyIdAndStudentId(Integer propertyId, Integer studentId);

    List<PropertyReview> findByStudentIdOrderByCreatedAtDesc(Integer studentId);

    Page<PropertyReview> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT r.propertyId,
                   AVG(r.ratingOverall),
                   COUNT(r),
                   AVG(r.ratingCleanliness),
                   AVG(r.ratingCondition),
                   AVG(r.ratingAmenities),
                   AVG(r.ratingLandlord),
                   AVG(r.ratingLocation),
                   AVG(r.ratingValue)
            FROM PropertyReview r
            WHERE r.propertyId IN :ids
            GROUP BY r.propertyId
            """)
    List<Object[]> aggregateCategoryRatingsByPropertyIds(@Param("ids") Collection<Integer> ids);

    @Query("SELECT AVG(r.ratingOverall) FROM PropertyReview r WHERE r.ratingOverall IS NOT NULL")
    Double averageOverallRating();
}
