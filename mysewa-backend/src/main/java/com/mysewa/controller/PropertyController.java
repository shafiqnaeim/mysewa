package com.mysewa.controller;

import com.mysewa.dto.request.PropertyRequest;
import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.service.PropertyService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Page<PropertyResponse> slice = propertyService.list(status, page, size);
        return ResponseEntity.ok(pagePayload(slice));
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Page<PropertyResponse> slice = propertyService.search(location, type, page, size);
        return ResponseEntity.ok(pagePayload(slice));
    }

    @GetMapping("/landlord/{landlordId}")
    public ResponseEntity<Map<String, List<PropertyResponse>>> listByLandlord(@PathVariable Integer landlordId) {
        return ResponseEntity.ok(Map.of("items", propertyService.listByLandlord(landlordId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, PropertyResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", propertyService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('LANDLORD')")
    public ResponseEntity<Map<String, PropertyResponse>> create(@RequestBody PropertyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", propertyService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LANDLORD')")
    public ResponseEntity<Map<String, PropertyResponse>> update(@PathVariable Integer id, @RequestBody PropertyRequest request) {
        return ResponseEntity.ok(Map.of("item", propertyService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LANDLORD')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        propertyService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Property deleted"));
    }

    private static Map<String, Object> pagePayload(Page<PropertyResponse> slice) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", slice.getContent());
        payload.put("totalElements", slice.getTotalElements());
        payload.put("totalPages", slice.getTotalPages());
        payload.put("page", slice.getNumber());
        payload.put("size", slice.getSize());
        return payload;
    }
}
