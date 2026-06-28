package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.PropertyReview;
import com.mysewa.api.domain.UniversityEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.PropertyReviewRepository;
import com.mysewa.api.repo.UniversityRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Admin-only table explorer: paginated rows and safe mutations on a fixed whitelist of resources
 * (not arbitrary SQL — avoids phpMyAdmin-style footguns while supporting CRUD-style workflows).
 */
@RestController
@RequestMapping("/api/v1/admin/database")
@CrossOrigin
public class AdminDatabaseController {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final Set<String> RESOURCES = Set.of(
            "users", "properties", "applications", "payments", "reviews", "universities"
    );

    private final UserAccountRepository userAccountRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UniversityRepository universityRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final PropertyReviewRepository propertyReviewRepository;
    private final AuthService authService;

    public AdminDatabaseController(
            UserAccountRepository userAccountRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UniversityRepository universityRepository,
            FinancialTransactionRepository financialTransactionRepository,
            PropertyReviewRepository propertyReviewRepository,
            AuthService authService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.universityRepository = universityRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.propertyReviewRepository = propertyReviewRepository;
        this.authService = authService;
    }

    @GetMapping("/resources")
    public ResponseEntity<?> listResources(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        List<Map<String, Object>> items = new ArrayList<>();
        items.add(meta("users", "Users", "Read-only grid; change account status from myDashboard."));
        items.add(meta("properties", "Properties", "List, edit status/name, delete when no applications."));
        items.add(meta("applications", "Bookings", "List, edit status, delete rows."));
        items.add(meta("payments", "Payments", "Ledger rows — edit status or delete."));
        items.add(meta("reviews", "Reviews", "List, edit rating/comment, delete, or add rows."));
        items.add(meta("universities", "Universities", "List, delete; create/update also in mySettings."));
        return ResponseEntity.ok(Map.of("items", items));
    }

    private static Map<String, Object> meta(String id, String label, String hint) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("label", label);
        m.put("hint", hint);
        return m;
    }

    @GetMapping("/{resource}/rows")
    public ResponseEntity<?> rows(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("resource") String resource,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "25") int size
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (!RESOURCES.contains(resource)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Unknown resource."));
        }
        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);
        PageRequest pr = PageRequest.of(safePage, safeSize);

        switch (resource) {
            case "users": {
                Page<UserAccount> pg = userAccountRepository.findAll(
                        PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
                );
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::userRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            case "properties": {
                Page<PropertyEntity> pg = propertyRepository.findAllByOrderByCreatedAtDesc(pr);
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::propertyRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            case "applications": {
                Page<Application> pg = applicationRepository.findAllByOrderByCreatedAtDesc(pr);
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::applicationRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            case "payments": {
                Page<FinancialTransaction> pg = financialTransactionRepository.findAll(
                        PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
                );
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::paymentRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            case "reviews": {
                Page<PropertyReview> pg = propertyReviewRepository.findAllByOrderByCreatedAtDesc(
                        PageRequest.of(safePage, safeSize)
                );
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::reviewRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            case "universities": {
                Page<UniversityEntity> pg = universityRepository.findAllByOrderBySortOrderAscCodeAsc(pr);
                List<Map<String, Object>> rows = pg.getContent().stream().map(this::universityRow).collect(Collectors.toList());
                return okPage(pg, rows);
            }
            default:
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Unknown resource."));
        }
    }

    private static ResponseEntity<?> okPage(Page<?> pg, List<Map<String, Object>> rows) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", rows);
        body.put("totalElements", pg.getTotalElements());
        body.put("totalPages", pg.getTotalPages());
        body.put("page", pg.getNumber());
        body.put("size", pg.getSize());
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> userRow(UserAccount u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("fullName", u.getFullName());
        m.put("role", u.getRole());
        m.put("accountStatus", u.getAccountStatus());
        m.put("verified", u.isVerified());
        m.put("createdAt", u.getCreatedAt() != null ? ISO.format(u.getCreatedAt()) : null);
        return m;
    }

    private Map<String, Object> propertyRow(PropertyEntity p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("landlordId", p.getLandlordId());
        m.put("name", p.getName());
        m.put("city", p.getCity());
        m.put("status", p.getStatus());
        m.put("price", p.getPrice());
        m.put("createdAt", p.getCreatedAt() != null ? ISO.format(p.getCreatedAt()) : null);
        return m;
    }

    private Map<String, Object> applicationRow(Application a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("propertyId", a.getPropertyId());
        m.put("studentId", a.getStudentId());
        m.put("status", a.getStatus());
        m.put("preferredMoveIn", a.getPreferredMoveIn());
        m.put("leaseEnd", a.getLeaseEnd());
        m.put("createdAt", a.getCreatedAt() != null ? ISO.format(a.getCreatedAt()) : null);
        return m;
    }

    private Map<String, Object> paymentRow(FinancialTransaction tx) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", tx.getId());
        m.put("applicationId", tx.getApplicationId());
        m.put("studentId", tx.getStudentId());
        m.put("propertyId", tx.getPropertyId());
        m.put("amount", tx.getAmount());
        m.put("currency", tx.getCurrency());
        m.put("type", tx.getType());
        m.put("status", tx.getStatus());
        m.put("externalRef", tx.getExternalRef());
        m.put("createdAt", tx.getCreatedAt() != null ? ISO.format(tx.getCreatedAt()) : null);
        return m;
    }

    private Map<String, Object> reviewRow(PropertyReview r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("propertyId", r.getPropertyId());
        m.put("studentId", r.getStudentId());
        m.put("rating", r.getRating());
        m.put("comment", r.getComment());
        m.put("createdAt", r.getCreatedAt() != null ? ISO.format(r.getCreatedAt()) : null);
        return m;
    }

    private Map<String, Object> universityRow(UniversityEntity u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("code", u.getCode());
        m.put("name", u.getName());
        m.put("latitude", u.getLatitude());
        m.put("longitude", u.getLongitude());
        m.put("active", Boolean.TRUE.equals(u.getActive()));
        m.put("city", u.getCity());
        m.put("state", u.getState());
        return m;
    }

    @PatchMapping("/{resource}/{id}")
    public ResponseEntity<?> patchRow(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("resource") String resource,
            @PathVariable("id") Integer id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (id == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "id is required"));
        }
        if (!RESOURCES.contains(resource)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Unknown resource."));
        }
        if ("users".equals(resource)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "User rows are read-only here — use PATCH /api/v1/admin/users/{id}/account-status from myDashboard."
            ));
        }
        if (body == null) {
            body = Map.of();
        }

        if ("applications".equals(resource)) {
            return patchApplication(id, body);
        }
        if ("properties".equals(resource)) {
            return patchProperty(id, body);
        }
        if ("universities".equals(resource)) {
            return patchUniversity(id, body);
        }
        if ("payments".equals(resource)) {
            return patchPayment(id, body);
        }
        if ("reviews".equals(resource)) {
            return patchReview(id, body);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Unsupported resource."));
    }

    @PostMapping("/{resource}")
    public ResponseEntity<?> createRow(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("resource") String resource,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (!RESOURCES.contains(resource)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Unknown resource."));
        }
        if (body == null) {
            body = Map.of();
        }
        if ("reviews".equals(resource)) {
            return createReview(body);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "message",
                "Create is only supported for reviews here — use mySettings for universities."
        ));
    }

    private ResponseEntity<?> createReview(Map<String, Object> body) {
        Integer propertyId = toInteger(body.get("propertyId"));
        Integer studentId = toInteger(body.get("studentId"));
        if (propertyId == null || studentId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId and studentId are required"));
        }
        if (!propertyRepository.existsById(propertyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        if (!userAccountRepository.existsById(studentId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Student not found"));
        }
        if (propertyReviewRepository.existsByPropertyIdAndStudentId(propertyId, studentId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Review already exists for this student and property"));
        }
        int rating = toInteger(body.get("rating")) != null ? toInteger(body.get("rating")) : 5;
        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "rating must be between 1 and 5"));
        }
        String comment = body.get("comment") == null ? "" : String.valueOf(body.get("comment")).trim();
        if (!StringUtils.hasText(comment)) {
            return ResponseEntity.badRequest().body(Map.of("message", "comment is required"));
        }
        PropertyReview row = new PropertyReview();
        row.setPropertyId(propertyId);
        row.setStudentId(studentId);
        row.setRating(rating);
        row.setComment(comment);
        row.setCreatedAt(LocalDateTime.now());
        PropertyReview saved = propertyReviewRepository.save(row);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", reviewRow(saved)));
    }

    private static Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private ResponseEntity<?> patchPayment(Integer id, Map<String, Object> body) {
        Optional<FinancialTransaction> opt = financialTransactionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Payment not found"));
        }
        FinancialTransaction tx = opt.get();
        Object st = body.get("status");
        if (st == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Field status is required"));
        }
        String normalized = String.valueOf(st).trim().toLowerCase(Locale.ROOT);
        if (!Set.of("pending", "completed", "failed", "refunded").contains(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "status must be pending, completed, failed, or refunded"));
        }
        tx.setStatus(normalized);
        financialTransactionRepository.save(tx);
        return ResponseEntity.ok(Map.of("item", paymentRow(tx)));
    }

    private ResponseEntity<?> patchReview(Integer id, Map<String, Object> body) {
        Optional<PropertyReview> opt = propertyReviewRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Review not found"));
        }
        PropertyReview row = opt.get();
        if (body.containsKey("rating")) {
            Integer rating = toInteger(body.get("rating"));
            if (rating == null || rating < 1 || rating > 5) {
                return ResponseEntity.badRequest().body(Map.of("message", "rating must be between 1 and 5"));
            }
            row.setRating(rating);
        }
        if (body.containsKey("comment")) {
            String comment = body.get("comment") == null ? "" : String.valueOf(body.get("comment")).trim();
            if (!StringUtils.hasText(comment)) {
                return ResponseEntity.badRequest().body(Map.of("message", "comment cannot be empty"));
            }
            row.setComment(comment);
        }
        propertyReviewRepository.save(row);
        return ResponseEntity.ok(Map.of("item", reviewRow(row)));
    }

    private ResponseEntity<?> patchApplication(Integer id, Map<String, Object> body) {
        Optional<Application> opt = applicationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application a = opt.get();
        Object st = body.get("status");
        if (st == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Field status is required"));
        }
        String normalized = String.valueOf(st).trim().toLowerCase(Locale.ROOT);
        if (!Set.of("pending", "accepted", "rejected").contains(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "status must be pending, accepted, or rejected"));
        }
        a.setStatus(normalized);
        a.setUpdatedAt(LocalDateTime.now());
        applicationRepository.save(a);
        return ResponseEntity.ok(Map.of("item", applicationRow(a)));
    }

    private ResponseEntity<?> patchProperty(Integer id, Map<String, Object> body) {
        Optional<PropertyEntity> opt = propertyRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity p = opt.get();
        if (body.containsKey("status")) {
            String s = body.get("status") == null ? "" : String.valueOf(body.get("status")).trim();
            if (!StringUtils.hasText(s) || s.length() > 64) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
            }
            p.setStatus(s);
        }
        if (body.containsKey("name")) {
            String n = body.get("name") == null ? "" : String.valueOf(body.get("name")).trim();
            if (!StringUtils.hasText(n)) {
                return ResponseEntity.badRequest().body(Map.of("message", "name cannot be empty"));
            }
            if (n.length() > 255) {
                return ResponseEntity.badRequest().body(Map.of("message", "name too long"));
            }
            p.setName(n);
        }
        p.setUpdatedAt(LocalDateTime.now());
        propertyRepository.save(p);
        return ResponseEntity.ok(Map.of("item", propertyRow(p)));
    }

    private ResponseEntity<?> patchUniversity(Integer id, Map<String, Object> body) {
        Optional<UniversityEntity> opt = universityRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "University not found"));
        }
        UniversityEntity u = opt.get();
        if (body.containsKey("name")) {
            String n = body.get("name") == null ? "" : String.valueOf(body.get("name")).trim();
            if (!StringUtils.hasText(n)) {
                return ResponseEntity.badRequest().body(Map.of("message", "name cannot be empty"));
            }
            u.setName(n);
        }
        if (body.containsKey("active")) {
            Object act = body.get("active");
            if (act instanceof Boolean) {
                u.setActive((Boolean) act);
            } else if (act != null) {
                u.setActive(Boolean.parseBoolean(String.valueOf(act)));
            }
        }
        if (body.containsKey("latitude") || body.containsKey("longitude")) {
            Object latObj = body.get("latitude");
            Object lngObj = body.get("longitude");
            if (latObj == null || lngObj == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "latitude and longitude must be sent together"));
            }
            double lat = toDouble(latObj);
            double lng = toDouble(lngObj);
            if (!Double.isFinite(lat) || !Double.isFinite(lng)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid coordinates"));
            }
            u.setLatitude(lat);
            u.setLongitude(lng);
        }
        u.setUpdatedAt(LocalDateTime.now());
        universityRepository.save(u);
        return ResponseEntity.ok(Map.of("item", universityRow(u)));
    }

    private static double toDouble(Object o) {
        if (o instanceof Number) {
            return ((Number) o).doubleValue();
        }
        return Double.parseDouble(String.valueOf(o).trim());
    }

    @DeleteMapping("/{resource}/{id}")
    public ResponseEntity<?> deleteRow(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("resource") String resource,
            @PathVariable("id") Integer id
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (id == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "id is required"));
        }
        if (!RESOURCES.contains(resource)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Unknown resource."));
        }
        if ("users".equals(resource)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Deleting user accounts from this explorer is disabled — suspend accounts from myDashboard instead."
            ));
        }
        if ("properties".equals(resource)) {
            if (applicationRepository.countByPropertyId(id) > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "message",
                        "Cannot delete a property that still has applications. Remove or reassign applications first."
                ));
            }
            if (!propertyRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
            }
            propertyRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted", "id", id));
        }
        if ("applications".equals(resource)) {
            if (!applicationRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
            }
            applicationRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted", "id", id));
        }
        if ("universities".equals(resource)) {
            Optional<UniversityEntity> opt = universityRepository.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "University not found"));
            }
            universityRepository.delete(opt.get());
            return ResponseEntity.ok(Map.of("message", "Deleted", "id", id));
        }
        if ("payments".equals(resource)) {
            if (!financialTransactionRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Payment not found"));
            }
            financialTransactionRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted", "id", id));
        }
        if ("reviews".equals(resource)) {
            if (!propertyReviewRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Review not found"));
            }
            propertyReviewRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted", "id", id));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Unsupported resource."));
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        if (!"admin".equalsIgnoreCase(String.valueOf(user.getRole()))) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private static ResponseEntity<?> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
