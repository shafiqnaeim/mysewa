package com.mysewa.api.service;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.domain.UserVerificationDocument;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.repo.UserVerificationDocumentRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VerificationService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final Pattern IC_PATTERN = Pattern.compile("^\\d{6}-\\d{2}-\\d{4}$");
    private static final long MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    private static final String IC_OCR_CONFIRMED_PATH = "__ocr_confirmed__";
    private static final Set<String> UPLOAD_SLOTS = Set.of("grant", "selfie");
    private static final Set<String> ALL_SLOTS = Set.of("ic", "grant", "selfie");
    private static final Set<String> SELF_SERVE_ROLES = Set.of("student", "landlord");

    private final UserAccountRepository userAccountRepository;
    private final UserVerificationDocumentRepository documentRepository;
    private final IcCryptoService icCryptoService;
    private final NotificationService notificationService;

    public VerificationService(
            UserAccountRepository userAccountRepository,
            UserVerificationDocumentRepository documentRepository,
            IcCryptoService icCryptoService,
            NotificationService notificationService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.documentRepository = documentRepository;
        this.icCryptoService = icCryptoService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Map<String, Object> uploadDocument(UserAccount user, String slot, MultipartFile file) throws IOException {
        requireSelfServeRole(user);
        String normalizedSlot = normalizeUploadSlot(slot);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose an image file to upload");
        }
        if (!isImage(file)) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image must be 8 MB or smaller");
        }

        Integer userId = user.getId();
        if (userId == null) {
            throw new IllegalArgumentException("User id is missing");
        }

        Path dir = Path.of("uploads", "verification", String.valueOf(userId));
        Files.createDirectories(dir);
        String filename = safeFilename(normalizedSlot, file.getOriginalFilename());
        Path target = dir.resolve(filename);
        Files.write(target, file.getBytes());

        String filePath = "/uploads/verification/" + userId + "/" + filename;
        UserVerificationDocument doc = documentRepository
                .findByUserIdAndDocumentType(userId, normalizedSlot)
                .orElseGet(UserVerificationDocument::new);
        doc.setUserId(userId);
        doc.setDocumentType(normalizedSlot);
        doc.setFilePath(filePath);
        doc.setUploadedAt(LocalDateTime.now());
        documentRepository.save(doc);

        if (isPendingReview(user.getDocumentVerificationStatus())) {
            user.setDocumentVerificationStatus("not_submitted");
            user.setVerificationSubmittedAt(null);
            user.setVerificationRejectionReason(null);
            user.setUpdatedAt(LocalDateTime.now());
            userAccountRepository.save(user);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("slot", normalizedSlot);
        body.put("url", filePath);
        body.put("uploadedAt", ISO.format(doc.getUploadedAt()));
        return body;
    }

    @Transactional
    public Map<String, Object> confirmIcFromOcr(UserAccount user, String icNumber, String extractedName) {
        requireSelfServeRole(user);
        Integer userId = user.getId();
        if (userId == null) {
            throw new IllegalArgumentException("User id is missing");
        }

        String normalized = formatIcNumber(icNumber);
        if (!IC_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("IC number must match format YYYYMM-DD-####");
        }

        String encrypted = icCryptoService.encryptForStorage(normalized);
        Optional<UserAccount> duplicate = userAccountRepository.findByIcNumber(encrypted);
        if (duplicate.isPresent() && !duplicate.get().getId().equals(userId)) {
            throw new IllegalArgumentException("This IC number is already linked to another account");
        }

        String storedPlain = icCryptoService.decryptForDisplay(user.getIcNumber());
        if (storedPlain != null && !storedPlain.isBlank() && !normalized.equals(storedPlain.trim())) {
            throw new IllegalArgumentException("IC number does not match your registered profile");
        }

        user.setIcNumber(encrypted);
        user.setUpdatedAt(LocalDateTime.now());
        if (isPendingReview(user.getDocumentVerificationStatus())) {
            user.setDocumentVerificationStatus("not_submitted");
            user.setVerificationSubmittedAt(null);
            user.setVerificationRejectionReason(null);
        }
        userAccountRepository.save(user);

        deleteIcImageIfPresent(userId);

        UserVerificationDocument doc = documentRepository
                .findByUserIdAndDocumentType(userId, "ic")
                .orElseGet(UserVerificationDocument::new);
        doc.setUserId(userId);
        doc.setDocumentType("ic");
        doc.setFilePath(IC_OCR_CONFIRMED_PATH);
        doc.setUploadedAt(LocalDateTime.now());
        documentRepository.save(doc);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("icConfirmed", true);
        body.put("icNumber", normalized);
        body.put("extractedName", blankToNull(extractedName));
        body.put("confirmedAt", ISO.format(doc.getUploadedAt()));
        return body;
    }

    @Transactional
    public void clearIcConfirmation(UserAccount user) {
        requireSelfServeRole(user);
        Integer userId = user.getId();
        if (userId == null) {
            return;
        }
        deleteIcImageIfPresent(userId);
        documentRepository.findByUserIdAndDocumentType(userId, "ic").ifPresent(documentRepository::delete);
    }

    @Transactional
    public Map<String, Object> submitForReview(UserAccount user) {
        requireSelfServeRole(user);
        Integer userId = user.getId();
        Map<String, UserVerificationDocument> docs = documentsByType(userId);
        if (!isIcConfirmed(docs.get("ic")) || !docs.containsKey("grant") || !docs.containsKey("selfie")) {
            throw new IllegalArgumentException("Confirm your IC, then upload your grant/matric receipt and selfie before submitting");
        }

        LocalDateTime now = LocalDateTime.now();
        user.setDocumentVerificationStatus("pending_review");
        user.setVerificationSubmittedAt(now);
        user.setVerificationRejectionReason(null);
        user.setUpdatedAt(now);
        userAccountRepository.save(user);

        notificationService.notifyIdentityVerificationSubmitted(user.getId(), user.getRole());

        return Map.of(
                "documentVerificationStatus", "pending_review",
                "submittedAt", ISO.format(now)
        );
    }

    public Map<String, Object> myVerificationStatus(UserAccount user) {
        Integer userId = user.getId();
        Map<String, UserVerificationDocument> docs = documentsByType(userId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("documentVerificationStatus", user.getDocumentVerificationStatus());
        body.put("submittedAt", formatIso(user.getVerificationSubmittedAt()));
        body.put("rejectionReason", user.getVerificationRejectionReason());
        UserVerificationDocument icDoc = docs.get("ic");
        body.put("icConfirmed", isIcConfirmed(icDoc));
        Map<String, Object> documentUrls = new LinkedHashMap<>();
        documentUrls.put("grantUrl", urlFor(docs.get("grant")));
        documentUrls.put("selfieUrl", urlFor(docs.get("selfie")));
        body.put("documents", documentUrls);
        return body;
    }

    public List<Map<String, Object>> listPendingForAdmin() {
        List<UserAccount> users = userAccountRepository.findAll();
        List<Map<String, Object>> items = new ArrayList<>();
        for (UserAccount user : users) {
            if (!isSelfServeRole(user.getRole())) {
                continue;
            }
            if (!isPendingReview(user.getDocumentVerificationStatus())) {
                continue;
            }
            items.add(toAdminSummary(user));
        }
        items.sort((a, b) -> String.valueOf(b.get("submittedAt")).compareTo(String.valueOf(a.get("submittedAt"))));
        return items;
    }

    public Map<String, Object> adminDetail(Integer userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!isSelfServeRole(user.getRole())) {
            throw new IllegalArgumentException("User is not eligible for identity verification");
        }
        return toAdminDetail(user);
    }

    @Transactional
    public UserAccount approveUser(Integer userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setDocumentVerificationStatus("verified");
        user.setVerificationRejectionReason(null);
        user.setUpdatedAt(LocalDateTime.now());
        UserAccount saved = userAccountRepository.save(user);
        notificationService.notifyIdentityVerificationApproved(saved.getId(), saved.getRole());
        return saved;
    }

    @Transactional
    public UserAccount rejectUser(Integer userId, String reason) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setDocumentVerificationStatus("rejected");
        user.setVerificationRejectionReason(blankToNull(reason));
        user.setUpdatedAt(LocalDateTime.now());
        UserAccount saved = userAccountRepository.save(user);
        notificationService.notifyIdentityVerificationRejected(saved.getId(), saved.getRole(), reason);
        return saved;
    }

    private Map<String, Object> toAdminSummary(UserAccount user) {
        Map<String, UserVerificationDocument> docs = documentsByType(user.getId());
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", user.getId());
        row.put("fullName", user.getFullName());
        row.put("role", user.getRole());
        row.put("documentVerificationStatus", user.getDocumentVerificationStatus());
        row.put("submittedAt", formatIso(user.getVerificationSubmittedAt()));
        row.put("selfieUrl", urlFor(docs.get("selfie")));
        row.put("grantUrl", urlFor(docs.get("grant")));
        row.put("systemChecks", buildSystemChecks(user, isIcConfirmed(docs.get("ic"))));
        return row;
    }

    private Map<String, Object> toAdminDetail(UserAccount user) {
        Map<String, UserVerificationDocument> docs = documentsByType(user.getId());
        Map<String, Object> row = toAdminSummary(user);
        row.put("grantLabel", "landlord".equalsIgnoreCase(nullSafe(user.getRole()))
                ? "Grant / Tax Receipt"
                : "University Matric Card");
        return row;
    }

    private Map<String, Object> buildSystemChecks(UserAccount user, boolean icUploaded) {
        boolean icFormatValid = false;
        if (icUploaded) {
            String plain = icCryptoService.decryptForDisplay(user.getIcNumber());
            icFormatValid = plain != null && IC_PATTERN.matcher(plain.trim()).matches();
        }
        boolean noDuplicate = !hasDuplicateIc(user);
        boolean nameMatches = user.getFullName() != null && !user.getFullName().isBlank();

        Map<String, Object> checks = new LinkedHashMap<>();
        checks.put("icFormatValid", icFormatValid);
        checks.put("noDuplicateAccount", noDuplicate);
        checks.put("nameMatchesSystem", nameMatches);
        return checks;
    }

    private boolean hasDuplicateIc(UserAccount user) {
        String stored = user.getIcNumber();
        if (stored == null || stored.isBlank() || user.getId() == null) {
            return false;
        }
        Optional<UserAccount> other = userAccountRepository.findByIcNumber(stored);
        return other.isPresent() && !other.get().getId().equals(user.getId());
    }

    private Map<String, UserVerificationDocument> documentsByType(Integer userId) {
        if (userId == null) {
            return Map.of();
        }
        return documentRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(
                        d -> nullSafe(d.getDocumentType()).toLowerCase(Locale.ROOT),
                        d -> d,
                        (a, b) -> b
                ));
    }

    private static String urlFor(UserVerificationDocument doc) {
        if (doc == null) {
            return null;
        }
        String path = doc.getFilePath();
        if (path == null || IC_OCR_CONFIRMED_PATH.equals(path)) {
            return null;
        }
        return path;
    }

    private static boolean isIcConfirmed(UserVerificationDocument doc) {
        return doc != null && IC_OCR_CONFIRMED_PATH.equals(doc.getFilePath());
    }

    private void deleteIcImageIfPresent(Integer userId) {
        documentRepository.findByUserIdAndDocumentType(userId, "ic").ifPresent(doc -> {
            String path = doc.getFilePath();
            if (path != null && !IC_OCR_CONFIRMED_PATH.equals(path)) {
                try {
                    Path file = Path.of("." + path);
                    Files.deleteIfExists(file);
                } catch (IOException ignored) {
                    /* ignore */
                }
            }
        });
    }

    private static String formatIcNumber(String raw) {
        String digits = String.valueOf(raw == null ? "" : raw).replaceAll("\\D", "");
        if (digits.length() != 12) {
            return String.valueOf(raw == null ? "" : raw).trim();
        }
        return digits.substring(0, 6) + "-" + digits.substring(6, 8) + "-" + digits.substring(8, 12);
    }

    private static String normalizeUploadSlot(String slot) {
        String s = nullSafe(slot).toLowerCase(Locale.ROOT);
        if ("matric".equals(s)) {
            s = "grant";
        }
        if ("ic".equals(s)) {
            throw new IllegalArgumentException(
                    "IC images are not stored. Scan your IC on this device and confirm your IC number instead."
            );
        }
        if (!UPLOAD_SLOTS.contains(s)) {
            throw new IllegalArgumentException("document slot must be grant or selfie");
        }
        return s;
    }

    private static String normalizeSlot(String slot) {
        String s = nullSafe(slot).toLowerCase(Locale.ROOT);
        if ("matric".equals(s)) {
            s = "grant";
        }
        if (!ALL_SLOTS.contains(s)) {
            throw new IllegalArgumentException("document slot must be ic, grant, or selfie");
        }
        return s;
    }

    private static void requireSelfServeRole(UserAccount user) {
        if (!isSelfServeRole(user.getRole())) {
            throw new IllegalArgumentException("Only students and landlords can upload verification documents");
        }
    }

    private static boolean isSelfServeRole(String role) {
        return SELF_SERVE_ROLES.contains(nullSafe(role).toLowerCase(Locale.ROOT));
    }

    public static boolean isPendingReview(String status) {
        String s = nullSafe(status).toLowerCase(Locale.ROOT);
        if (s.isEmpty() || "verified".equals(s) || "exempt".equals(s) || "not_submitted".equals(s) || "rejected".equals(s)) {
            return false;
        }
        return s.contains("pending") || s.contains("submitted") || s.contains("review") || s.contains("await");
    }

    private static boolean isImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            return true;
        }
        String name = nullSafe(file.getOriginalFilename()).toLowerCase(Locale.ROOT);
        return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")
                || name.endsWith(".gif") || name.endsWith(".webp");
    }

    private static String safeFilename(String slot, String original) {
        String ext = ".jpg";
        if (original != null && original.contains(".")) {
            String candidate = original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (candidate.matches("\\.(jpe?g|png|gif|webp)")) {
                ext = candidate;
            }
        }
        return slot + ext;
    }

    private static String formatIso(LocalDateTime dt) {
        return dt != null ? ISO.format(dt) : null;
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
