package com.mysewa.repository;

import com.mysewa.model.Notification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    List<Notification> findByUser_IdOrderByCreatedAtDesc(Integer userId);

    Optional<Notification> findByIdAndUser_Id(Integer id, Integer userId);
}
