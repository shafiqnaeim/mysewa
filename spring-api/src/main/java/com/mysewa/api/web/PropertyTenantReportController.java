package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.PropertyTenantReport;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.PropertyTenantReportRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/properties")
@CrossOrigin
public class PropertyTenantReportController {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final long MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_RECEIVED = "received";
    private static final String STATUS_RESOLVED = "resolved";

    private final PropertyTenantReportRepository propertyTenantReportRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UserAccountRepository userAccountRepository;
    private final AuthService authService;

    public PropertyTenantReportController(
            PropertyTenantReportRepository propertyTenantReportRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UserAccountRepository userAccountRepository,
            AuthService authService
    ) {
        this.propertyTenantReportRepository = propertyTenantReportRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.userAccountRepository = userAccountRepository;
        this.authService = authService;
    }

    @GetMapping("/{propertyId}/tenant-reports")
    public ResponseEntity<?> listForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId
    ) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(propertyId);
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only view tenant reports for your own listings."
            ));
        }

        List<PropertyTenantReport> rows = propertyTenantReportRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId);
        List<Map<String, Object>> items = new ArrayList<>();
        for (PropertyTenantReport r : rows) {
            UserAccount st = userAccountRepository.findById(r.getStudentId()).orElse(null);
            items.add(toItem(r, st));
        }
        return ResponseEntity.ok(Map.of("items", items));
    }

    @GetMapping("/{propertyId}/tenant-reports/mine")
    public ResponseEntity<?> listMineForStudent(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        if (propertyRepository.findById(propertyId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        Optional<Application> appOpt = applicationRepository.findByPropertyIdAndStudentId(propertyId, student.getId());
        if (appOpt.isEmpty() || !"accepted".equalsIgnoreCase(nullSafe(appOpt.get().getStatus()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only view reports for a property where you have an accepted application."
            ));
        }

        List<PropertyTenantReport> rows =
                propertyTenantReportRepository.findByPropertyIdAndStudentIdOrderByCreatedAtDesc(propertyId, student.getId());
        List<Map<String, Object>> items = new ArrayList<>();
        for (PropertyTenantReport r : rows) {
            items.add(toItem(r, student));
        }
        return ResponseEntity.ok(Map.of("items", items));
    }

    @PostMapping(value = "/{propertyId}/tenant-reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId,
            @RequestParam("message") String message,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        String body = message == null ? "" : message.trim();
        if (body.length() < 10) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "Please write at least 10 characters describing the issue."
            ));
        }
        if (body.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Report is too long (max 4000 characters)."));
        }

        Optional<PropertyEntity> propOpt = propertyRepository.findById(propertyId);
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() != null && property.getLandlordId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You cannot file a tenant report against your own listing."
            ));
        }

        Optional<Application> appOpt = applicationRepository.findByPropertyIdAndStudentId(propertyId, student.getId());
        if (appOpt.isEmpty() || !"accepted".equalsIgnoreCase(nullSafe(appOpt.get().getStatus()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only submit reports for a property where the landlord has accepted your application."
            ));
        }
        Application app = appOpt.get();
        if (!propertyId.equals(app.getPropertyId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Application does not match this property."));
        }

        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            String ct = image.getContentType();
            if (ct == null || !ct.toLowerCase(java.util.Locale.ROOT).startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Attachment must be an image (JPG, PNG, …)."));
            }
            if ("image/svg+xml".equalsIgnoreCase(ct)) {
                return ResponseEntity.badRequest().body(Map.of("message", "SVG images are not allowed for security reasons."));
            }
            if (image.getSize() > MAX_IMAGE_BYTES) {
                return ResponseEntity.badRequest().body(Map.of("message", "Image is too large (max 8 MB)."));
            }
            try {
                Path dir = Path.of("uploads", "property-tenant-reports", String.valueOf(propertyId));
                Files.createDirectories(dir);
                String name = UUID.randomUUID().toString().replace("-", "") + "_" + safeImageFilename(image.getOriginalFilename());
                Path target = dir.resolve(name);
                image.transferTo(target);
                imageUrl = "/uploads/property-tenant-reports/" + propertyId + "/" + name;
            } catch (Exception ex) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "message",
                        ex.getMessage() != null ? ex.getMessage() : "Image upload failed"
                ));
            }
        }

        PropertyTenantReport row = new PropertyTenantReport();
        row.setPropertyId(propertyId);
        row.setApplicationId(app.getId());
        row.setStudentId(student.getId());
        row.setReportBody(body);
        row.setImageUrl(imageUrl);
        row.setStatus(STATUS_PENDING);
        LocalDateTime now = LocalDateTime.now();
        row.setCreatedAt(now);
        PropertyTenantReport saved = propertyTenantReportRepository.save(row);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", toItem(saved, student)));
    }

    @PostMapping("/{propertyId}/tenant-reports/{reportId}/receive")
    @Transactional
    public ResponseEntity<?> landlordReceive(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId,
            @PathVariable("reportId") Integer reportId
    ) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (propertyId == null || reportId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId and reportId are required"));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(propertyId);
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only acknowledge reports for your own listings."
            ));
        }

        Optional<PropertyTenantReport> repOpt = propertyTenantReportRepository.findByIdAndPropertyId(reportId, propertyId);
        if (repOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Report not found."));
        }
        PropertyTenantReport r = repOpt.get();
        String st = normalizeStatus(r.getStatus());
        if (STATUS_RESOLVED.equals(st)) {
            return ResponseEntity.badRequest().body(Map.of("message", "This report is already resolved."));
        }
        if (STATUS_RECEIVED.equals(st)) {
            UserAccount stu = userAccountRepository.findById(r.getStudentId()).orElse(null);
            return ResponseEntity.ok(Map.of("item", toItem(r, stu)));
        }
        if (!STATUS_PENDING.equals(st)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid report status."));
        }
        r.setStatus(STATUS_RECEIVED);
        r.setReceivedAt(LocalDateTime.now());
        PropertyTenantReport saved = propertyTenantReportRepository.save(r);
        UserAccount stu = userAccountRepository.findById(saved.getStudentId()).orElse(null);
        return ResponseEntity.ok(Map.of("item", toItem(saved, stu)));
    }

    @PostMapping("/{propertyId}/tenant-reports/{reportId}/resolve")
    @Transactional
    public ResponseEntity<?> studentResolve(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("propertyId") Integer propertyId,
            @PathVariable("reportId") Integer reportId
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (propertyId == null || reportId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId and reportId are required"));
        }
        Optional<Application> appOpt = applicationRepository.findByPropertyIdAndStudentId(propertyId, student.getId());
        if (appOpt.isEmpty() || !"accepted".equalsIgnoreCase(nullSafe(appOpt.get().getStatus()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only update reports for a property where you have an accepted application."
            ));
        }

        Optional<PropertyTenantReport> repOpt = propertyTenantReportRepository.findByIdAndPropertyId(reportId, propertyId);
        if (repOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Report not found."));
        }
        PropertyTenantReport r = repOpt.get();
        if (!r.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only resolve your own reports."));
        }
        String st = normalizeStatus(r.getStatus());
        if (STATUS_RESOLVED.equals(st)) {
            return ResponseEntity.ok(Map.of("item", toItem(r, student)));
        }
        if (STATUS_PENDING.equals(st)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Your landlord must tap Receive on this report before you can mark it resolved."
            ));
        }
        if (!STATUS_RECEIVED.equals(st)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid report status."));
        }
        r.setStatus(STATUS_RESOLVED);
        r.setResolvedAt(LocalDateTime.now());
        PropertyTenantReport saved = propertyTenantReportRepository.save(r);
        return ResponseEntity.ok(Map.of("item", toItem(saved, student)));
    }

    private Map<String, Object> toItem(PropertyTenantReport r, UserAccount studentForName) {
        Map<String, Object> one = new LinkedHashMap<>();
        one.put("id", r.getId());
        one.put("message", r.getReportBody());
        one.put("imageUrl", r.getImageUrl());
        one.put("applicationId", r.getApplicationId());
        one.put("studentDisplayName", displayName(studentForName));
        one.put("createdAt", r.getCreatedAt() != null ? ISO.format(r.getCreatedAt()) : null);
        one.put("status", normalizeStatus(r.getStatus()));
        one.put("receivedAt", r.getReceivedAt() != null ? ISO.format(r.getReceivedAt()) : null);
        one.put("resolvedAt", r.getResolvedAt() != null ? ISO.format(r.getResolvedAt()) : null);
        return one;
    }

    private static String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return STATUS_PENDING;
        }
        return raw.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private static String safeImageFilename(String original) {
        if (original == null) {
            return "photo";
        }
        String base = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (base.length() > 100) {
            return base.substring(base.length() - 100);
        }
        return base.isEmpty() ? "photo" : base;
    }

    private static String displayName(UserAccount u) {
        if (u == null || u.getFullName() == null || u.getFullName().trim().isEmpty()) {
            return "Student";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts[0];
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"landlord".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only landlord accounts can view tenant reports");
        }
        return u;
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"student".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only student accounts can use tenant reports");
        }
        return u;
    }

    private static ResponseEntity<?> unauthorizedOrForbidden(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
