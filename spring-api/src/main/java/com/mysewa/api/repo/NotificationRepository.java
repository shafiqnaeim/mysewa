package com.mysewa.api.repo;

import com.mysewa.api.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId);

    Optional<Notification> findByIdAndUserId(Integer id, Integer userId);
}
