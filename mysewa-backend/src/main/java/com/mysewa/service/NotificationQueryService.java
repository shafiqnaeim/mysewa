package com.mysewa.service;

import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Notification;
import com.mysewa.model.User;
import com.mysewa.repository.NotificationRepository;
import com.mysewa.util.SecurityUtil;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;

    public NotificationQueryService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForCurrentUser() {
        User user = SecurityUtil.currentUser();
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(NotificationQueryService::toMap)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> markRead(Integer id) {
        User user = SecurityUtil.currentUser();
        Notification row = notificationRepository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        row.setRead(true);
        return toMap(notificationRepository.save(row));
    }

    @Transactional
    public void delete(Integer id) {
        User user = SecurityUtil.currentUser();
        Notification row = notificationRepository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notificationRepository.delete(row);
    }

    private static Map<String, Object> toMap(Notification row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.getId());
        item.put("userId", row.getUser() != null ? row.getUser().getId() : null);
        item.put("title", row.getTitle());
        item.put("message", row.getMessage());
        item.put("read", row.isRead());
        item.put("createdAt", row.getCreatedAt());
        return item;
    }
}
