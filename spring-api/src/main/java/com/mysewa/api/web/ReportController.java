package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/maintenance-reports", "/api/v1/reports/maintenance"})
@CrossOrigin
public class ReportController {

    private final ReportService reportService;
    private final AuthService authService;

    public ReportController(ReportService reportService, AuthService authService) {
        this.reportService = reportService;
        this.authService = authService;
    }

    @GetMapping("/student")
    public ResponseEntity<?> listForStudent(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            UserAccount student = requireStudent(authorization);
            List<ReportItemResponse> items = reportService.listForStudent(student);
            return ResponseEntity.ok(Map.of("items", items));
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
    }

    @GetMapping("/landlord")
    public ResponseEntity<?> listForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "status", required = false) String status
    ) {
        try {
            UserAccount landlord = requireLandlord(authorization);
            List<ReportItemResponse> items = reportService.listForLandlord(landlord, status);
            return ResponseEntity.ok(Map.of("items", items));
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("propertyId") Integer propertyId,
            @RequestParam("category") String category,
            @RequestParam("description") String description,
            @RequestParam(value = "photo", required = false) MultipartFile photo
    ) {
        try {
            UserAccount student = requireStudent(authorization);
            ReportItemResponse item = reportService.createReport(student, propertyId, category, description, photo);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", item));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{reportId}/acknowledge")
    public ResponseEntity<?> acknowledge(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("reportId") Integer reportId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        try {
            UserAccount landlord = requireLandlord(authorization);
            String notes = body != null ? body.get("landlordNotes") : null;
            ReportItemResponse item = reportService.acknowledgeReport(landlord, reportId, notes);
            return ResponseEntity.ok(Map.of("item", item));
        } catch (IllegalArgumentException ex) {
            return badRequestOrNotFound(ex);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{reportId}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("reportId") Integer reportId,
            @RequestBody Map<String, String> body
    ) {
        try {
            UserAccount landlord = requireLandlord(authorization);
            String status = body != null ? body.get("status") : null;
            String notes = body != null ? body.get("landlordNotes") : null;
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "status is required"));
            }
            ReportItemResponse item = reportService.updateStatus(landlord, reportId, status, notes);
            return ResponseEntity.ok(Map.of("item", item));
        } catch (IllegalArgumentException ex) {
            return badRequestOrNotFound(ex);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{reportId}/resolve")
    public ResponseEntity<?> resolve(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("reportId") Integer reportId
    ) {
        try {
            UserAccount student = requireStudent(authorization);
            ReportItemResponse item = reportService.resolveByStudent(student, reportId);
            return ResponseEntity.ok(Map.of("item", item));
        } catch (IllegalArgumentException ex) {
            return badRequestOrNotFound(ex);
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"landlord".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only landlord accounts can access this resource");
        }
        return u;
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"student".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only student accounts can access this resource");
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

    private static ResponseEntity<?> badRequestOrNotFound(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "Invalid request" : ex.getMessage();
        if (m.toLowerCase().contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", m));
        }
        return ResponseEntity.badRequest().body(Map.of("message", m));
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
