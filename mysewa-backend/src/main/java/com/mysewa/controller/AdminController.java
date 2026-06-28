package com.mysewa.controller;

import com.mysewa.dto.request.UserStatusUpdateRequest;
import com.mysewa.dto.response.BookingResponse;
import com.mysewa.dto.response.PaymentResponse;
import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.dto.response.UserResponse;
import com.mysewa.service.AdminService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> statistics() {
        return ResponseEntity.ok(adminService.statistics());
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Page<UserResponse> slice = adminService.listUsers(page, size);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", slice.getContent());
        payload.put("totalElements", slice.getTotalElements());
        payload.put("totalPages", slice.getTotalPages());
        payload.put("page", slice.getNumber());
        payload.put("size", slice.getSize());
        return ResponseEntity.ok(payload);
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<Map<String, UserResponse>> verifyUser(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", adminService.verifyUser(id)));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<Map<String, UserResponse>> updateUserStatus(
            @PathVariable Integer id,
            @RequestBody UserStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(Map.of("item", adminService.updateUserStatus(id, request)));
    }

    @GetMapping("/properties/pending")
    public ResponseEntity<Map<String, List<PropertyResponse>>> pendingProperties() {
        return ResponseEntity.ok(Map.of("items", adminService.listPendingProperties()));
    }

    @PutMapping("/properties/{id}/verify")
    public ResponseEntity<Map<String, PropertyResponse>> verifyProperty(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", adminService.verifyProperty(id)));
    }

    @GetMapping("/bookings")
    public ResponseEntity<Map<String, List<BookingResponse>>> listBookings() {
        return ResponseEntity.ok(Map.of("items", adminService.listBookings()));
    }

    @GetMapping("/payments")
    public ResponseEntity<Map<String, List<PaymentResponse>>> listPayments() {
        return ResponseEntity.ok(Map.of("items", adminService.listPayments()));
    }
}
