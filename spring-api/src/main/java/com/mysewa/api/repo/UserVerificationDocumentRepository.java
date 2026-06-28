package com.mysewa.api.repo;

import com.mysewa.api.domain.UserVerificationDocument;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserVerificationDocumentRepository extends JpaRepository<UserVerificationDocument, Integer> {
    List<UserVerificationDocument> findByUserId(Integer userId);

    Optional<UserVerificationDocument> findByUserIdAndDocumentType(Integer userId, String documentType);

    void deleteByUserIdAndDocumentType(Integer userId, String documentType);
}
