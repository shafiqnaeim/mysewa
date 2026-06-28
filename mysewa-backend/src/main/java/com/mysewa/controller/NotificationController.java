package com.mysewa.controller;

import com.mysewa.service.NotificationQueryService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationQueryService notificationQueryService;

    public NotificationController(NotificationQueryService notificationQueryService) {
        this.notificationQueryService = notificationQueryService;
    }

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> listForUser() {
        List<Map<String, Object>> items = notificationQueryService.listForCurrentUser();
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", notificationQueryService.markRead(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        notificationQueryService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}
