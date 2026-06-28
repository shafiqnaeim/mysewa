package com.mysewa.api.web;

import com.mysewa.api.domain.Notification;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.NotificationRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/notifications", "/api/notifications"})
@CrossOrigin
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final AuthService authService;

    public NotificationController(NotificationRepository notificationRepository, AuthService authService) {
        this.notificationRepository = notificationRepository;
        this.authService = authService;
    }

    @GetMapping("/user")
    public ResponseEntity<?> listForUser(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        List<Map<String, Object>> items = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationController::toItem)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        Notification row = notificationRepository.findByIdAndUserId(id, user.getId())
                .orElse(null);
        if (row == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification not found"));
        }
        row.setRead(true);
        notificationRepository.save(row);
        return ResponseEntity.ok(Map.of("item", toItem(row)));
    }

    private static Map<String, Object> toItem(Notification row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.getId());
        item.put("userId", row.getUserId());
        item.put("title", row.getTitle());
        item.put("message", row.getMessage());
        item.put("read", row.isRead());
        item.put("createdAt", row.getCreatedAt());
        return item;
    }

    private ResponseEntity<Map<String, String>> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() != null ? ex.getMessage() : "Unauthorized";
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("not found")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
