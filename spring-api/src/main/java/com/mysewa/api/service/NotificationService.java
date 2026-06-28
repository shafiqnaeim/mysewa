package com.mysewa.api.service;

import com.mysewa.api.domain.Notification;
import com.mysewa.api.repo.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification notifyUser(Integer userId, String title, String message) {
        if (userId == null || title == null || title.isBlank()) {
            return null;
        }
        Notification row = new Notification();
        row.setUserId(userId);
        row.setTitle(title.trim());
        row.setMessage(message != null ? message.trim() : null);
        row.setRead(false);
        row.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(row);
    }
}
