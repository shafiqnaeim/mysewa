package com.mysewa.api.web;

import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.CampusProximityService;
import com.mysewa.api.service.PropertyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import com.mysewa.api.repo.PropertyReviewRepository;

@RestController
@RequestMapping({"/api/v1/properties", "/api/properties"})
@CrossOrigin
public class PropertyController {

    private final PropertyRepository propertyRepository;
    private final PropertyReviewRepository propertyReviewRepository;
    private final AuthService authService;
    private final CampusProximityService campusProximityService;
    private final PropertyService propertyService;

    public PropertyController(
            PropertyRepository propertyRepository,
            PropertyReviewRepository propertyReviewRepository,
            AuthService authService,
            CampusProximityService campusProximityService,
            PropertyService propertyService
    ) {
        this.propertyRepository = propertyRepository;
        this.propertyReviewRepository = propertyReviewRepository;
        this.authService = authService;
        this.campusProximityService = campusProximityService;
        this.propertyService = propertyService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<PropertyEntity> slice;
        if (StringUtils.hasText(status)) {
            slice = propertyRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim(), pr);
        } else {
            slice = propertyRepository.findAllByOrderByCreatedAtDesc(pr);
        }

        List<Integer> ids = slice.getContent().stream()
                .map(PropertyEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        Map<Integer, double[]> reviewStats = reviewStatsForPropertyIds(ids);

        List<PropertyResponse> body = slice.getContent().stream()
                .map(PropertyResponse::fromEntity)
                .peek((dto) -> enrichReviewStats(dto, reviewStats))
                .collect(Collectors.toList());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", body);
        payload.put("totalElements", slice.getTotalElements());
        payload.put("totalPages", slice.getTotalPages());
        payload.put("page", slice.getNumber());
        payload.put("size", slice.getSize());

        return ResponseEntity.ok(payload);
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam(required = false) String campus,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Integer bedrooms
    ) {
        List<PropertyEntity> filtered = propertyRepository.findAll().stream()
                .filter(p -> !StringUtils.hasText(campus) || campus.equalsIgnoreCase(nullSafe(p.getCampus())))
                .filter(p -> {
                    if (!StringUtils.hasText(location)) return true;
                    String q = location.trim().toLowerCase();
                    return nullSafe(p.getLocation()).toLowerCase().contains(q)
                            || nullSafe(p.getCity()).toLowerCase().contains(q)
                            || nullSafe(p.getState()).toLowerCase().contains(q)
                            || nullSafe(p.getCampus()).toLowerCase().contains(q);
                })
                .filter(p -> !StringUtils.hasText(type) || type.equalsIgnoreCase(nullSafe(p.getType())))
                .filter(p -> !StringUtils.hasText(status) || status.equalsIgnoreCase(nullSafe(p.getStatus())))
                .filter(p -> minPrice == null || (p.getPrice() != null && p.getPrice() >= minPrice))
                .filter(p -> maxPrice == null || (p.getPrice() != null && p.getPrice() <= maxPrice))
                .filter(p -> bedrooms == null || (p.getCapacity() != null && p.getCapacity() >= bedrooms))
                .sorted((a, b) -> Integer.compare(b.getId() == null ? 0 : b.getId(), a.getId() == null ? 0 : a.getId()))
                .collect(Collectors.toList());

        List<Integer> searchIds = filtered.stream().map(PropertyEntity::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Map<Integer, double[]> reviewStats = reviewStatsForPropertyIds(searchIds);

        List<PropertyResponse> items = filtered.stream()
                .map(PropertyResponse::fromEntity)
                .peek((dto) -> enrichReviewStats(dto, reviewStats))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @GetMapping("/landlord/{landlordId}")
    public ResponseEntity<?> listForLandlord(@PathVariable("landlordId") Integer landlordId) {
        List<PropertyEntity> rows = propertyRepository.findByLandlordIdOrderByUpdatedAtDesc(landlordId);
        List<Integer> ids = rows.stream().map(PropertyEntity::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Map<Integer, double[]> reviewStats = reviewStatsForPropertyIds(ids);
        List<PropertyResponse> items = rows.stream()
                .map(PropertyResponse::fromEntity)
                .peek((dto) -> enrichReviewStats(dto, reviewStats))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Integer id) {
        return propertyRepository.findById(id)
                .map(entity -> {
                    PropertyResponse dto = PropertyResponse.fromEntity(entity);
                    enrichReviewStats(dto, reviewStatsForPropertyIds(List.of(entity.getId())));
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("item", dto);
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found")));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PropertyUpsertRequest request
    ) {
        UserAccount actor;
        try {
            actor = requireLandlord(authorization);
            propertyService.validatePropertyRequest(request);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
        PropertyEntity entity = new PropertyEntity();
        request.setLandlordId(actor.getId());
        propertyService.applyRequest(entity, request, campusProximityService);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        if (!StringUtils.hasText(entity.getStatus())) {
            entity.setStatus("available");
        }
        PropertyEntity saved = propertyRepository.save(entity);
        PropertyResponse dto = PropertyResponse.fromEntity(saved);
        enrichReviewStats(dto, reviewStatsForPropertyIds(List.of(saved.getId())));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Integer id,
            @RequestBody PropertyUpsertRequest request
    ) {
        UserAccount actor;
        try {
            actor = requireLandlord(authorization);
            propertyService.validatePropertyRequest(request);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
        return propertyRepository.findById(id).<ResponseEntity<?>>map(existing -> {
            if (existing.getLandlordId() != null && !existing.getLandlordId().equals(actor.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only manage your own properties"));
            }
            request.setLandlordId(actor.getId());
            propertyService.applyRequest(existing, request, campusProximityService);
            existing.setUpdatedAt(LocalDateTime.now());
            PropertyEntity saved = propertyRepository.save(existing);
            PropertyResponse dto = PropertyResponse.fromEntity(saved);
            enrichReviewStats(dto, reviewStatsForPropertyIds(List.of(saved.getId())));
            return ResponseEntity.ok(Map.of("item", dto));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Integer id
    ) {
        UserAccount actor;
        try {
            actor = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
        return propertyRepository.findById(id).<ResponseEntity<?>>map(existing -> {
            if (existing.getLandlordId() != null && !existing.getLandlordId().equals(actor.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only manage your own properties"));
            }
            propertyRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Property deleted"));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found")));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("images") MultipartFile[] images
    ) {
        try {
            requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
        if (images == null || images.length == 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "No files uploaded"));
        }
        try {
            Path uploadDir = Path.of("uploads", "properties");
            Files.createDirectories(uploadDir);
            List<String> uploaded = new java.util.ArrayList<>();
            for (MultipartFile file : images) {
                if (file.isEmpty()) {
                    continue;
                }
                String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
                String name = "property-" + UUID.randomUUID() + (StringUtils.hasText(ext) ? "." + ext : "");
                Path target = uploadDir.resolve(name);
                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                uploaded.add("/uploads/properties/" + name);
            }
            return ResponseEntity.ok(Map.of("files", uploaded, "count", uploaded.size()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Upload failed"));
        }
    }

    @DeleteMapping("/upload/{filename}")
    public ResponseEntity<?> deleteUpload(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String filename
    ) {
        try {
            requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
        try {
            Path target = Path.of("uploads", "properties", filename);
            if (!Files.exists(target)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "File not found"));
            }
            Files.delete(target);
            return ResponseEntity.ok(Map.of("message", "File deleted"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Delete failed"));
        }
    }

    private Map<Integer, double[]> reviewStatsForPropertyIds(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = propertyReviewRepository.aggregateRatingsByPropertyIds(ids);
        Map<Integer, double[]> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 3 || row[0] == null) {
                continue;
            }
            Integer pid = (Integer) row[0];
            Number avg = (Number) row[1];
            Number cnt = (Number) row[2];
            map.put(pid, new double[]{avg != null ? avg.doubleValue() : 0d, cnt != null ? cnt.longValue() : 0L});
        }
        return map;
    }

    private static void enrichReviewStats(PropertyResponse dto, Map<Integer, double[]> stats) {
        if (dto.getId() == null) {
            return;
        }
        double[] s = stats.get(dto.getId());
        if (s != null) {
            dto.setAverageRating(s[0]);
            dto.setReviewCount((long) s[1]);
        } else {
            dto.setAverageRating(null);
            dto.setReviewCount(0L);
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount user = authService.me(authorization);
        if (!"landlord".equalsIgnoreCase(nullSafe(user.getRole()))) {
            throw new IllegalArgumentException("Only landlord accounts can manage properties");
        }
        return user;
    }
}
