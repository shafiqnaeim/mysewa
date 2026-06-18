package com.mysewa.api.web;

import com.mysewa.api.domain.UniversityEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.UniversityRepository;
import com.mysewa.api.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/universities")
@CrossOrigin
public class UniversityController {

    private static final Logger log = LoggerFactory.getLogger(UniversityController.class);

    private final UniversityRepository universityRepository;
    private final AuthService authService;

    public UniversityController(UniversityRepository universityRepository, AuthService authService) {
        this.universityRepository = universityRepository;
        this.authService = authService;
    }

    /** Public list for maps and distance calculations (active + pinned only). */
    @GetMapping
    public ResponseEntity<?> listPublic() {
        try {
            List<UniversityResponse> items = universityRepository.findByActiveTrueOrderBySortOrderAscCodeAsc().stream()
                    .filter(u -> u.getLatitude() != null && u.getLongitude() != null)
                    .map(UniversityResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
        } catch (DataAccessException ex) {
            log.error("Failed to load public universities", ex);
            return databaseErrorResponse(ex);
        }
    }

    /** Admin: all universities including those without a pin yet. */
    @GetMapping("/manage")
    public ResponseEntity<?> listForAdmin(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        try {
            List<UniversityResponse> items = universityRepository.findAllByOrderBySortOrderAscCodeAsc().stream()
                    .map(UniversityResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
        } catch (DataAccessException ex) {
            log.error("Failed to load universities for admin", ex);
            return databaseErrorResponse(ex);
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UniversityCreateRequest request
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        if (!StringUtils.hasText(request.code)) {
            return ResponseEntity.badRequest().body(Map.of("message", "University code is required."));
        }
        if (!StringUtils.hasText(request.name)) {
            return ResponseEntity.badRequest().body(Map.of("message", "University name is required."));
        }
        String code = request.code.trim().toUpperCase();
        if (universityRepository.findByCodeIgnoreCase(code).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "University code already exists."));
        }
        if (request.latitude == null || request.longitude == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Drop a pin on the map — latitude and longitude are required."));
        }
        UniversityEntity entity = new UniversityEntity();
        entity.setCode(code);
        entity.setName(request.name.trim());
        entity.setLatitude(request.latitude);
        entity.setLongitude(request.longitude);
        entity.setCity(trimOrNull(request.city));
        entity.setState(trimOrNull(request.state));
        entity.setPostcode(trimOrNull(request.postcode));
        entity.setActive(request.active == null || request.active);
        entity.setSortOrder(request.sortOrder);
        entity.setUpdatedAt(LocalDateTime.now());
        universityRepository.save(entity);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("message", "University created.");
        payload.put("item", UniversityResponse.fromEntity(entity));
        return ResponseEntity.status(HttpStatus.CREATED).body(payload);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Integer id,
            @RequestBody UniversityUpdateRequest request
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        return universityRepository.findById(id)
                .<ResponseEntity<?>>map(entity -> {
                    if (StringUtils.hasText(request.code)) {
                        String code = request.code.trim().toUpperCase();
                        Optional<UniversityEntity> codeOwner = universityRepository.findByCodeIgnoreCase(code);
                        if (codeOwner.isPresent() && !codeOwner.get().getId().equals(entity.getId())) {
                            return ResponseEntity.status(HttpStatus.CONFLICT)
                                    .body(Map.of("message", "University code already exists."));
                        }
                        entity.setCode(code);
                    }
                    if (StringUtils.hasText(request.name)) {
                        entity.setName(request.name.trim());
                    }
                    if (request.latitude != null) {
                        entity.setLatitude(request.latitude);
                    }
                    if (request.longitude != null) {
                        entity.setLongitude(request.longitude);
                    }
                    if (request.city != null) {
                        entity.setCity(trimOrNull(request.city));
                    }
                    if (request.state != null) {
                        entity.setState(trimOrNull(request.state));
                    }
                    if (request.postcode != null) {
                        entity.setPostcode(trimOrNull(request.postcode));
                    }
                    if (request.active != null) {
                        entity.setActive(request.active);
                    }
                    if (request.sortOrder != null) {
                        entity.setSortOrder(request.sortOrder);
                    }
                    if (request.latitude != null || request.longitude != null) {
                        if (entity.getLatitude() == null || entity.getLongitude() == null) {
                            return ResponseEntity.badRequest()
                                    .body(Map.of("message", "Both latitude and longitude are required when pinning."));
                        }
                    }
                    entity.setUpdatedAt(LocalDateTime.now());
                    universityRepository.save(entity);
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("message", "University updated.");
                    payload.put("item", UniversityResponse.fromEntity(entity));
                    return ResponseEntity.ok(payload);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "University not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Integer id
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        return universityRepository.findById(id)
                .<ResponseEntity<?>>map(entity -> {
                    universityRepository.delete(entity);
                    return ResponseEntity.ok(Map.of("message", "University deleted.", "id", id));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "University not found")));
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        if (!"admin".equalsIgnoreCase(String.valueOf(user.getRole()))) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private static String trimOrNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static ResponseEntity<Map<String, String>> databaseErrorResponse(DataAccessException ex) {
        String detail = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String hint = "Run spring-api/sql/universities.sql on the mysewa database, then restart the Spring API.";
        if (detail != null && detail.toLowerCase().contains("doesn't exist")) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "The universities table is missing. " + hint));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Database error loading universities. " + hint));
    }
}
