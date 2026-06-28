package com.mysewa.controller;

import com.mysewa.dto.response.UserResponse;
import com.mysewa.service.UserService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Page<UserResponse> slice = userService.listAll(page, size);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", slice.getContent());
        payload.put("totalElements", slice.getTotalElements());
        payload.put("totalPages", slice.getTotalPages());
        payload.put("page", slice.getNumber());
        payload.put("size", slice.getSize());
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STUDENT','LANDLORD')")
    public ResponseEntity<Map<String, UserResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", userService.getById(id)));
    }
}
