package com.mysewa.api.web;

import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.SavedProperty;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.SavedPropertyRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/v1/saved-properties", "/api/saved-properties"})
@CrossOrigin
public class SavedPropertyController {

    private final SavedPropertyRepository savedPropertyRepository;
    private final PropertyRepository propertyRepository;
    private final AuthService authService;

    public SavedPropertyController(
            SavedPropertyRepository savedPropertyRepository,
            PropertyRepository propertyRepository,
            AuthService authService
    ) {
        this.savedPropertyRepository = savedPropertyRepository;
        this.propertyRepository = propertyRepository;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<?> save(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Integer> body
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        Integer propertyId = body != null ? body.get("propertyId") : null;
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        Optional<PropertyEntity> propertyOpt = propertyRepository.findById(propertyId);
        if (propertyOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        if (savedPropertyRepository.existsByStudentIdAndPropertyId(student.getId(), propertyId)) {
            return ResponseEntity.ok(Map.of("message", "Property already saved", "propertyId", propertyId));
        }
        SavedProperty row = new SavedProperty();
        row.setStudentId(student.getId());
        row.setPropertyId(propertyId);
        row.setCreatedAt(LocalDateTime.now());
        SavedProperty saved = savedPropertyRepository.save(row);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", toItem(saved, propertyOpt.get())));
    }

    @DeleteMapping("/{propertyId}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        savedPropertyRepository.deleteByStudentIdAndPropertyId(student.getId(), propertyId);
        return ResponseEntity.ok(Map.of("message", "Saved property removed"));
    }

    @GetMapping("/student")
    public ResponseEntity<?> listForStudent(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        List<SavedProperty> rows = savedPropertyRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        List<Map<String, Object>> items = new ArrayList<>();
        for (SavedProperty row : rows) {
            PropertyEntity property = propertyRepository.findById(row.getPropertyId()).orElse(null);
            items.add(toItem(row, property));
        }
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    private static Map<String, Object> toItem(SavedProperty row, PropertyEntity property) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.getId());
        item.put("propertyId", row.getPropertyId());
        item.put("savedAt", row.getCreatedAt());
        if (property != null) {
            item.put("property", PropertyResponse.fromEntity(property));
        }
        return item;
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount user = authService.me(authorization);
        String role = user.getRole() != null ? user.getRole().toLowerCase(Locale.ROOT) : "";
        if (!"student".equals(role)) {
            throw new IllegalArgumentException("Student access required");
        }
        return user;
    }

    private ResponseEntity<Map<String, String>> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() != null ? ex.getMessage() : "Unauthorized";
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("not found")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
