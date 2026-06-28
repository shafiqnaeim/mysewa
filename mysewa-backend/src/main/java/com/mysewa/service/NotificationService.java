package com.mysewa.service;

import com.mysewa.model.Notification;
import com.mysewa.model.User;
import com.mysewa.repository.NotificationRepository;
import com.mysewa.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Notification notify(Integer userId, String title, String message) {
        if (userId == null || title == null || title.isBlank()) {
            return null;
        }
        User user = userRepository.getReferenceById(userId);
        Notification row = Notification.builder()
                .user(user)
                .title(title.trim())
                .message(message)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        return notificationRepository.save(row);
    }
}
