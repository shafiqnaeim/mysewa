package com.mysewa.api.service;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.Report;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.ReportRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.web.ReportItemResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReportService {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_ACKNOWLEDGED = "ACKNOWLEDGED";
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_RESOLVED = "RESOLVED";

    private static final long MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "plumbing",
            "electrical",
            "air_conditioning",
            "furniture",
            "pest_control",
            "internet_wifi",
            "other"
    );

    private final ReportRepository reportRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationService notificationService;

    public ReportService(
            ReportRepository reportRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UserAccountRepository userAccountRepository,
            NotificationService notificationService
    ) {
        this.reportRepository = reportRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationService = notificationService;
    }

    public List<ReportItemResponse> listForStudent(UserAccount student) {
        List<Report> rows = reportRepository.findByStudentIdOrderBySubmittedAtDesc(student.getId());
        return toItems(rows);
    }

    public List<ReportItemResponse> listForLandlord(UserAccount landlord, String statusFilter) {
        List<PropertyEntity> properties = propertyRepository.findByLandlordIdOrderByUpdatedAtDesc(landlord.getId());
        List<Integer> propertyIds = properties.stream()
                .map(PropertyEntity::getId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (propertyIds.isEmpty()) {
            return List.of();
        }
        String normalized = normalizeStatusFilter(statusFilter);
        List<Report> rows = normalized == null
                ? reportRepository.findByPropertyIdInOrderBySubmittedAtDesc(propertyIds)
                : reportRepository.findByPropertyIdInAndStatusOrderBySubmittedAtDesc(propertyIds, normalized);
        return toItems(rows);
    }

    @Transactional
    public ReportItemResponse createReport(
            UserAccount student,
            Integer propertyId,
            String category,
            String description,
            MultipartFile photo
    ) {
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        String cat = normalizeCategory(category);
        if (!ALLOWED_CATEGORIES.contains(cat)) {
            throw new IllegalArgumentException("Invalid category");
        }
        String body = description == null ? "" : description.trim();
        if (body.length() < 10) {
            throw new IllegalArgumentException("Please write at least 10 characters describing the issue.");
        }
        if (body.length() > 4000) {
            throw new IllegalArgumentException("Description is too long (max 4000 characters).");
        }

        PropertyEntity property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found"));
        if (property.getLandlordId() != null && property.getLandlordId().equals(student.getId())) {
            throw new IllegalStateException("You cannot file a report against your own listing.");
        }

        Application app = applicationRepository.findByPropertyIdAndStudentId(propertyId, student.getId())
                .filter(a -> "accepted".equalsIgnoreCase(nullSafe(a.getStatus())))
                .orElseThrow(() -> new IllegalStateException(
                        "You can only submit reports for a property where the landlord has accepted your application."
                ));

        String photoUrl = savePhoto(propertyId, photo);
        LocalDateTime now = LocalDateTime.now();

        Report row = new Report();
        row.setStudentId(student.getId());
        row.setPropertyId(propertyId);
        row.setApplicationId(app.getId());
        row.setCategory(cat);
        row.setDescription(body);
        row.setPhotoUrl(photoUrl);
        row.setStatus(STATUS_PENDING);
        row.setSubmittedAt(now);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);

        Report saved = reportRepository.save(row);
        notificationService.notifyStudentMaintenanceSubmitted(student.getId());
        if (property.getLandlordId() != null) {
            notificationService.notifyLandlordNewMaintenanceReport(
                    property.getLandlordId(),
                    displayName(student),
                    property.getName()
            );
        }

        return toItem(saved);
    }

    @Transactional
    public ReportItemResponse acknowledgeReport(UserAccount landlord, Integer reportId, String notes) {
        Report row = loadLandlordReport(landlord, reportId);
        String st = normalizeStatus(row.getStatus());
        if (STATUS_RESOLVED.equals(st)) {
            throw new IllegalStateException("This report is already resolved.");
        }
        if (STATUS_ACKNOWLEDGED.equals(st) || STATUS_IN_PROGRESS.equals(st)) {
            if (notes != null && !notes.isBlank()) {
                row.setLandlordNotes(notes.trim());
                row.setUpdatedAt(LocalDateTime.now());
                reportRepository.save(row);
            }
            return toItem(row);
        }
        if (!STATUS_PENDING.equals(st)) {
            throw new IllegalStateException("Invalid report status.");
        }

        LocalDateTime now = LocalDateTime.now();
        row.setStatus(STATUS_ACKNOWLEDGED);
        row.setAcknowledgedAt(now);
        row.setUpdatedAt(now);
        if (notes != null && !notes.isBlank()) {
            row.setLandlordNotes(notes.trim());
        }
        Report saved = reportRepository.save(row);
        notificationService.notifyStudentMaintenanceAcknowledged(saved.getStudentId());
        return toItem(saved);
    }

    @Transactional
    public ReportItemResponse updateStatus(
            UserAccount landlord,
            Integer reportId,
            String newStatus,
            String notes
    ) {
        Report row = loadLandlordReport(landlord, reportId);
        String target = normalizeStatus(newStatus);
        if (!Set.of(STATUS_ACKNOWLEDGED, STATUS_IN_PROGRESS, STATUS_RESOLVED).contains(target)) {
            throw new IllegalArgumentException("Status must be ACKNOWLEDGED, IN_PROGRESS, or RESOLVED");
        }
        String current = normalizeStatus(row.getStatus());
        if (STATUS_RESOLVED.equals(current) && !STATUS_RESOLVED.equals(target)) {
            throw new IllegalStateException("Cannot change status of a resolved report.");
        }

        LocalDateTime now = LocalDateTime.now();
        row.setStatus(target);
        row.setUpdatedAt(now);
        if (notes != null && !notes.isBlank()) {
            row.setLandlordNotes(notes.trim());
        }
        if (STATUS_ACKNOWLEDGED.equals(target) && row.getAcknowledgedAt() == null) {
            row.setAcknowledgedAt(now);
        }
        if (STATUS_RESOLVED.equals(target)) {
            row.setResolvedAt(now);
        }
        Report saved = reportRepository.save(row);

        if (STATUS_ACKNOWLEDGED.equals(target)) {
            notificationService.notifyStudentMaintenanceAcknowledged(saved.getStudentId());
        }
        if (STATUS_RESOLVED.equals(target)) {
            notificationService.notifyStudentMaintenanceResolved(saved.getStudentId());
        }

        return toItem(saved);
    }

    @Transactional
    public ReportItemResponse resolveByStudent(UserAccount student, Integer reportId) {
        Report row = reportRepository.findByIdAndStudentId(reportId, student.getId())
                .orElseThrow(() -> new IllegalArgumentException("Report not found."));
        String st = normalizeStatus(row.getStatus());
        if (STATUS_RESOLVED.equals(st)) {
            return toItem(row);
        }
        if (STATUS_PENDING.equals(st)) {
            throw new IllegalStateException("Your landlord must acknowledge this report before you can mark it resolved.");
        }
        if (!Set.of(STATUS_ACKNOWLEDGED, STATUS_IN_PROGRESS).contains(st)) {
            throw new IllegalStateException("Invalid report status.");
        }

        LocalDateTime now = LocalDateTime.now();
        row.setStatus(STATUS_RESOLVED);
        row.setResolvedAt(now);
        row.setUpdatedAt(now);
        Report saved = reportRepository.save(row);
        notificationService.notifyStudentMaintenanceResolved(saved.getStudentId());
        return toItem(saved);
    }

    private Report loadLandlordReport(UserAccount landlord, Integer reportId) {
        if (reportId == null) {
            throw new IllegalArgumentException("reportId is required");
        }
        Report row = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found."));
        PropertyEntity property = propertyRepository.findById(row.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            throw new IllegalStateException("You can only manage reports for your own listings.");
        }
        return row;
    }

    private List<ReportItemResponse> toItems(List<Report> rows) {
        Map<Integer, String> propertyNames = new LinkedHashMap<>();
        Map<Integer, UserAccount> students = new LinkedHashMap<>();
        List<ReportItemResponse> items = new ArrayList<>();
        for (Report r : rows) {
            String propName = propertyNames.computeIfAbsent(r.getPropertyId(), pid ->
                    propertyRepository.findById(pid)
                            .map(p -> p.getName() != null ? p.getName() : "Property #" + pid)
                            .orElse("Property #" + pid)
            );
            UserAccount st = students.computeIfAbsent(r.getStudentId(), sid ->
                    userAccountRepository.findById(sid).orElse(null)
            );
            items.add(ReportItemResponse.from(r, propName, st));
        }
        return items;
    }

    private ReportItemResponse toItem(Report r) {
        String propName = propertyRepository.findById(r.getPropertyId())
                .map(p -> p.getName() != null ? p.getName() : "Property #" + r.getPropertyId())
                .orElse("Property #" + r.getPropertyId());
        UserAccount st = userAccountRepository.findById(r.getStudentId()).orElse(null);
        return ReportItemResponse.from(r, propName, st);
    }

    private String savePhoto(Integer propertyId, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            return null;
        }
        String ct = photo.getContentType();
        if (ct == null || !ct.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Attachment must be an image (JPG, PNG, …).");
        }
        if ("image/svg+xml".equalsIgnoreCase(ct)) {
            throw new IllegalArgumentException("SVG images are not allowed for security reasons.");
        }
        if (photo.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image is too large (max 8 MB).");
        }
        try {
            Path dir = Path.of("uploads", "maintenance-reports", String.valueOf(propertyId));
            Files.createDirectories(dir);
            String name = UUID.randomUUID().toString().replace("-", "") + "_"
                    + safeImageFilename(photo.getOriginalFilename());
            Path target = dir.resolve(name);
            photo.transferTo(target);
            return "/uploads/maintenance-reports/" + propertyId + "/" + name;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException(ex.getMessage() != null ? ex.getMessage() : "Image upload failed");
        }
    }

    public static String normalizeCategory(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ROOT).replace(' ', '_').replace('/', '_');
    }

    private static String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return STATUS_PENDING;
        }
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if ("RECEIVED".equals(upper)) {
            return STATUS_ACKNOWLEDGED;
        }
        return upper;
    }

    private static String normalizeStatusFilter(String raw) {
        if (raw == null || raw.isBlank() || "all".equalsIgnoreCase(raw.trim())) {
            return null;
        }
        return normalizeStatus(raw);
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
            return "A student";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts[0];
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
