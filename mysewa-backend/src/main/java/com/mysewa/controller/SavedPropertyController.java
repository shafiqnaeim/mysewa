package com.mysewa.controller;

import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.service.SavedPropertyService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/saved-properties")
@PreAuthorize("hasRole('STUDENT')")
public class SavedPropertyController {

    private final SavedPropertyService savedPropertyService;

    public SavedPropertyController(SavedPropertyService savedPropertyService) {
        this.savedPropertyService = savedPropertyService;
    }

    @PostMapping("/{propertyId}")
    public ResponseEntity<Map<String, PropertyResponse>> save(@PathVariable Integer propertyId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", savedPropertyService.save(propertyId)));
    }

    @DeleteMapping("/{propertyId}")
    public ResponseEntity<Map<String, String>> remove(@PathVariable Integer propertyId) {
        savedPropertyService.remove(propertyId);
        return ResponseEntity.ok(Map.of("message", "Removed from saved properties"));
    }

    @GetMapping("/student")
    public ResponseEntity<Map<String, List<PropertyResponse>>> listForStudent() {
        return ResponseEntity.ok(Map.of("items", savedPropertyService.listForStudent()));
    }
}
