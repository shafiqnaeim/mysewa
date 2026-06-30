package com.mysewa.api.web;

import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.ApplicationRentMonthRecord;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.payment.DepositType;
import com.mysewa.api.payment.DepositCalculator;
import com.mysewa.api.repo.ApplicationRentMonthRecordRepository;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UniversityRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AdminService;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.VerificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/admin", "/api/admin"})
@CrossOrigin
public class AdminController {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final UserAccountRepository userAccountRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UniversityRepository universityRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ApplicationRentMonthRecordRepository rentMonthRecordRepository;
    private final AuthService authService;
    private final VerificationService verificationService;
    private final AdminService adminService;

    public AdminController(
            UserAccountRepository userAccountRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UniversityRepository universityRepository,
            FinancialTransactionRepository financialTransactionRepository,
            ApplicationRentMonthRecordRepository rentMonthRecordRepository,
            AuthService authService,
            VerificationService verificationService,
            AdminService adminService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.universityRepository = universityRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.rentMonthRecordRepository = rentMonthRecordRepository;
        this.authService = authService;
        this.verificationService = verificationService;
        this.adminService = adminService;
    }

    @GetMapping({"/stats", "/statistics"})
    public ResponseEntity<?> stats(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        long usersTotal = userAccountRepository.count();
        long students = userAccountRepository.countByRoleIgnoreCase("student");
        long landlords = userAccountRepository.countByRoleIgnoreCase("landlord");
        long admins = userAccountRepository.countByRoleIgnoreCase("admin");
        long propertiesTotal = propertyRepository.count();
        long applicationsTotal = applicationRepository.count();
        long applicationsPending = applicationRepository.countByStatusIgnoreCase("pending");
        long applicationsAccepted = applicationRepository.countByStatusIgnoreCase("accepted");
        long applicationsRejected = applicationRepository.countByStatusIgnoreCase("rejected");
        long universitiesTotal = universityRepository.count();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("usersTotal", usersTotal);
        body.put("usersStudents", students);
        body.put("usersLandlords", landlords);
        body.put("usersAdmins", admins);
        body.put("propertiesTotal", propertiesTotal);
        body.put("applicationsTotal", applicationsTotal);
        body.put("applicationsPending", applicationsPending);
        body.put("applicationsAccepted", applicationsAccepted);
        body.put("applicationsRejected", applicationsRejected);
        body.put("universitiesTotal", universitiesTotal);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/properties/count-by-type")
    public ResponseEntity<?> propertyCountByType(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        return ResponseEntity.ok(adminService.countPropertiesByType());
    }

    @GetMapping("/payments")
    public ResponseEntity<?> listPayments(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        List<FinancialTransaction> ledger = financialTransactionRepository.findAllByOrderByCreatedAtDesc();
        List<Application> applications = applicationRepository.findAll();
        Map<Integer, Application> appById = new HashMap<>();
        Set<Integer> acceptedAppIds = new HashSet<>();
        for (Application a : applications) {
            if (a.getId() != null) {
                appById.put(a.getId(), a);
                if ("accepted".equalsIgnoreCase(nullSafe(a.getStatus()))) {
                    acceptedAppIds.add(a.getId());
                }
            }
        }

        List<Integer> allAppIds = applications.stream()
                .map(Application::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        Set<Integer> paidDepositAppIds = new HashSet<>(
                financialTransactionRepository.findApplicationIdsWithCompletedDeposit(allAppIds)
        );

        List<Map<String, Object>> items = new ArrayList<>();
        Set<String> seenRentMonthKeys = new HashSet<>();

        for (FinancialTransaction tx : ledger) {
            items.add(mapLedgerTransaction(tx, appById));
        }

        for (Application app : applications) {
            if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
                continue;
            }
            if (app.getId() == null || paidDepositAppIds.contains(app.getId())) {
                continue;
            }
            PropertyEntity property = app.getPropertyId() != null
                    ? propertyRepository.findById(app.getPropertyId()).orElse(null)
                    : null;
            UserAccount student = app.getStudentId() != null
                    ? userAccountRepository.findById(app.getStudentId()).orElse(null)
                    : null;
            BigDecimal amount = DepositCalculator.resolveForApplication(app, property);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", "deposit-pending-" + app.getId());
            row.put("transactionId", null);
            row.put("applicationId", app.getId());
            row.put("date", app.getUpdatedAt() != null ? ISO.format(app.getUpdatedAt()) : formatIso(app.getCreatedAt()));
            row.put("student", displayName(student));
            row.put("property", property != null ? property.getName() : "Property #" + app.getPropertyId());
            row.put("amount", amount);
            row.put("type", "Deposit");
            row.put("status", "pending");
            row.put("currency", "MYR");
            row.put("externalRef", null);
            items.add(row);
        }

        int currentYear = LocalDateTime.now().getYear();
        for (Integer appId : acceptedAppIds) {
            Application app = appById.get(appId);
            if (app == null) {
                continue;
            }
            PropertyEntity property = app.getPropertyId() != null
                    ? propertyRepository.findById(app.getPropertyId()).orElse(null)
                    : null;
            UserAccount student = app.getStudentId() != null
                    ? userAccountRepository.findById(app.getStudentId()).orElse(null)
                    : null;
            for (int year : new int[] { currentYear, currentYear - 1 }) {
                List<ApplicationRentMonthRecord> months =
                        rentMonthRecordRepository.findByApplicationIdAndRentYearOrderByRentMonthAsc(appId, year);
                for (ApplicationRentMonthRecord record : months) {
                    String state = nullSafe(record.getMonthState()).toLowerCase(Locale.ROOT);
                    if ("unavailable".equals(state)) {
                        continue;
                    }
                    BigDecimal amount = record.getAmount();
                    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                        continue;
                    }
                    String key = appId + "-" + year + "-" + record.getRentMonth();
                    if (!seenRentMonthKeys.add(key)) {
                        continue;
                    }
                    LocalDateTime recordedAt = record.getRecordedAt() != null
                            ? record.getRecordedAt()
                            : LocalDateTime.of(year, Math.max(1, record.getRentMonth()), 1, 0, 0);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", "rent-" + key);
                    row.put("transactionId", record.getId());
                    row.put("applicationId", appId);
                    row.put("date", ISO.format(recordedAt));
                    row.put("student", displayName(student));
                    row.put("property", property != null ? property.getName() : "Property #" + app.getPropertyId());
                    row.put("amount", amount);
                    row.put("type", "Rent");
                    row.put("status", "received".equals(state) || "paid".equals(state) || "completed".equals(state)
                            ? "paid"
                            : "pending");
                    row.put("currency", "MYR");
                    row.put("externalRef", null);
                    items.add(row);
                }
            }
        }

        items.sort((a, b) -> {
            String da = String.valueOf(a.get("date"));
            String db = String.valueOf(b.get("date"));
            return db.compareTo(da);
        });

        Map<String, Object> stats = computePaymentStats(items);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", items.size());
        body.put("stats", stats);
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> mapLedgerTransaction(FinancialTransaction tx, Map<Integer, Application> appById) {
        Application app = tx.getApplicationId() != null ? appById.get(tx.getApplicationId()) : null;
        PropertyEntity property = tx.getPropertyId() != null
                ? propertyRepository.findById(tx.getPropertyId()).orElse(null)
                : (app != null && app.getPropertyId() != null
                ? propertyRepository.findById(app.getPropertyId()).orElse(null)
                : null);
        UserAccount student = tx.getStudentId() != null
                ? userAccountRepository.findById(tx.getStudentId()).orElse(null)
                : (app != null && app.getStudentId() != null
                ? userAccountRepository.findById(app.getStudentId()).orElse(null)
                : null);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "tx-" + tx.getId());
        row.put("transactionId", tx.getId());
        row.put("applicationId", tx.getApplicationId());
        row.put("date", formatIso(tx.getCreatedAt()));
        row.put("student", displayName(student));
        row.put("property", property != null ? property.getName() : (tx.getPropertyId() != null ? "Property #" + tx.getPropertyId() : "—"));
        row.put("amount", tx.getAmount());
        row.put("type", displayPaymentType(tx.getType()));
        row.put("status", displayPaymentStatus(tx.getStatus()));
        row.put("currency", tx.getCurrency());
        row.put("externalRef", tx.getExternalRef());
        return row;
    }

    private static Map<String, Object> computePaymentStats(List<Map<String, Object>> items) {
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal thisMonth = BigDecimal.ZERO;
        BigDecimal pending = BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        for (Map<String, Object> row : items) {
            BigDecimal amount = toBigDecimal(row.get("amount"));
            if (amount == null) {
                continue;
            }
            String status = nullSafe(String.valueOf(row.get("status"))).toLowerCase(Locale.ROOT);
            if ("paid".equals(status) || "completed".equals(status)) {
                totalRevenue = totalRevenue.add(amount);
                String dateRaw = String.valueOf(row.get("date"));
                if (dateRaw.length() >= 7) {
                    try {
                        LocalDateTime dt = LocalDateTime.parse(dateRaw, ISO);
                        if (dt.getMonthValue() == month && dt.getYear() == year) {
                            thisMonth = thisMonth.add(amount);
                        }
                    } catch (Exception ignored) {
                        /* skip */
                    }
                }
            } else if ("pending".equals(status)) {
                pending = pending.add(amount);
            }
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRevenue", totalRevenue);
        stats.put("thisMonth", thisMonth);
        stats.put("pending", pending);
        return stats;
    }

    private static String displayPaymentType(String rawType) {
        String t = nullSafe(rawType).toLowerCase(Locale.ROOT);
        if (t.startsWith("deposit") || DepositType.COMPLETED_DEPOSIT_TYPES.contains(t)) {
            return "Deposit";
        }
        if (t.contains("rent")) {
            return "Rent";
        }
        return "Payment";
    }

    private static String displayPaymentStatus(String rawStatus) {
        String s = nullSafe(rawStatus).toLowerCase(Locale.ROOT);
        if ("completed".equals(s) || "paid".equals(s) || "received".equals(s)) {
            return "paid";
        }
        if ("failed".equals(s)) {
            return "failed";
        }
        if ("refunded".equals(s)) {
            return "refunded";
        }
        return "pending";
    }

    private static String displayName(UserAccount user) {
        if (user == null) {
            return "—";
        }
        String name = user.getFullName() != null ? user.getFullName().trim() : "";
        if (!name.isEmpty()) {
            return name.split("\\s+")[0];
        }
        if (user.getEmail() != null && user.getEmail().contains("@")) {
            return user.getEmail().split("@")[0];
        }
        return "User";
    }

    private static String formatIso(LocalDateTime dt) {
        return dt != null ? ISO.format(dt) : null;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    @GetMapping("/logs")
    public ResponseEntity<?> listActivityLogs(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        List<Map<String, Object>> items = new ArrayList<>();

        List<UserAccount> users = userAccountRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        for (UserAccount u : users) {
            if (u.getCreatedAt() != null) {
                items.add(logEntry(
                        "user-reg-" + u.getId(),
                        u.getCreatedAt(),
                        displayLogUser(u),
                        "User Registered",
                        "New " + nullSafe(u.getRole()).toLowerCase(Locale.ROOT) + " account created",
                        "user",
                        "info"
                ));
            }
            if ("suspended".equalsIgnoreCase(nullSafe(u.getAccountStatus())) && u.getUpdatedAt() != null) {
                items.add(logEntry(
                        "user-susp-" + u.getId(),
                        u.getUpdatedAt(),
                        displayLogUser(u),
                        "Account Suspended",
                        "User account marked suspended",
                        "user",
                        "warning"
                ));
            }
        }

        List<PropertyEntity> properties = propertyRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        for (PropertyEntity p : properties) {
            if (p.getCreatedAt() == null) {
                continue;
            }
            String name = p.getName() != null ? p.getName() : ("Property #" + p.getId());
            items.add(logEntry(
                    "prop-" + p.getId(),
                    p.getCreatedAt(),
                    "System",
                    "Property Listed",
                    "New property \"" + name + "\"",
                    "property",
                    "info"
            ));
            if ("rejected".equalsIgnoreCase(nullSafe(p.getStatus()))) {
                LocalDateTime at = p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt();
                items.add(logEntry(
                        "prop-rej-" + p.getId(),
                        at,
                        "System",
                        "Property Rejected",
                        "Listing \"" + name + "\" marked rejected",
                        "property",
                        "warning"
                ));
            }
        }

        List<Application> applications = applicationRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Map<Integer, UserAccount> userById = users.stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(UserAccount::getId, u -> u, (a, b) -> a));
        Map<Integer, PropertyEntity> propertyById = properties.stream()
                .filter(p -> p.getId() != null)
                .collect(Collectors.toMap(PropertyEntity::getId, p -> p, (a, b) -> a));

        for (Application a : applications) {
            if (a.getCreatedAt() == null) {
                continue;
            }
            UserAccount student = a.getStudentId() != null ? userById.get(a.getStudentId()) : null;
            PropertyEntity property = a.getPropertyId() != null ? propertyById.get(a.getPropertyId()) : null;
            String actor = displayLogUser(student);
            String propName = property != null && property.getName() != null
                    ? property.getName()
                    : ("property #" + a.getPropertyId());

            String status = nullSafe(a.getStatus()).toLowerCase(Locale.ROOT);
            if ("accepted".equals(status)) {
                LocalDateTime at = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                items.add(logEntry(
                        "app-acc-" + a.getId(),
                        at,
                        actor,
                        "Booking Approved",
                        "Booking confirmed for " + propName,
                        "booking",
                        "info"
                ));
            } else if ("rejected".equals(status)) {
                LocalDateTime at = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                items.add(logEntry(
                        "app-rej-" + a.getId(),
                        at,
                        actor,
                        "Booking Rejected",
                        "Application rejected for " + propName,
                        "booking",
                        "warning"
                ));
            } else {
                items.add(logEntry(
                        "app-pend-" + a.getId(),
                        a.getCreatedAt(),
                        actor,
                        "Booking Application",
                        "New booking request for " + propName,
                        "booking",
                        "info"
                ));
            }
        }

        List<FinancialTransaction> txs = financialTransactionRepository.findAllByOrderByCreatedAtDesc();
        for (FinancialTransaction tx : txs) {
            if (tx.getCreatedAt() == null) {
                continue;
            }
            UserAccount student = tx.getStudentId() != null ? userById.get(tx.getStudentId()) : null;
            String actor = displayLogUser(student);
            String typeLabel = nullSafe(tx.getType()).toLowerCase(Locale.ROOT).contains("rent") ? "Rent" : "Deposit";
            BigDecimal amount = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
            String details = typeLabel + " RM " + amount.stripTrailingZeros().toPlainString();
            String st = nullSafe(tx.getStatus()).toLowerCase(Locale.ROOT);
            String level = "failed".equals(st) ? "error" : "pending".equals(st) ? "warning" : "info";
            String event = "failed".equals(st) ? "Payment Failed" : "Payment Processed";
            items.add(logEntry(
                    "pay-" + tx.getId(),
                    tx.getCreatedAt(),
                    actor,
                    event,
                    details,
                    "payment",
                    level
            ));
        }

        long uniCount = universityRepository.count();
        items.add(logEntry(
                "system-uni-" + uniCount,
                LocalDateTime.now(),
                "System",
                "Directory Snapshot",
                uniCount + " universities in campus directory",
                "system",
                "info"
        ));

        items.sort((a, b) -> String.valueOf(b.get("timestamp")).compareTo(String.valueOf(a.get("timestamp"))));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", items.size());
        return ResponseEntity.ok(body);
    }

    private static Map<String, Object> logEntry(
            String id,
            LocalDateTime at,
            String user,
            String event,
            String details,
            String eventType,
            String level
    ) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("timestamp", ISO.format(at));
        row.put("user", user);
        row.put("event", event);
        row.put("details", details);
        row.put("ipAddress", "-");
        row.put("eventType", eventType);
        row.put("level", level);
        return row;
    }

    private static String displayLogUser(UserAccount user) {
        if (user == null) {
            return "System";
        }
        String name = user.getFullName() != null ? user.getFullName().trim() : "";
        if (!name.isEmpty()) {
            return name.split("\\s+")[0];
        }
        if (user.getEmail() != null && user.getEmail().contains("@")) {
            return user.getEmail().split("@")[0];
        }
        return "User";
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);
        Page<UserAccount> pg = userAccountRepository.findAll(
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<AdminUserRowResponse> items = pg.getContent().stream().map(AdminUserRowResponse::from).collect(Collectors.toList());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("totalElements", pg.getTotalElements());
        body.put("totalPages", pg.getTotalPages());
        body.put("page", pg.getNumber());
        body.put("size", pg.getSize());
        return ResponseEntity.ok(body);
    }

    @RequestMapping(value = "/users/{id}/account-status", method = { RequestMethod.PATCH, RequestMethod.PUT })
    public ResponseEntity<?> updateUserAccountStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer userId,
            @RequestBody AdminAccountStatusRequest request
    ) {
        UserAccount admin;
        try {
            admin = requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User id is required"));
        }
        String raw = request == null || request.accountStatus == null ? "" : request.accountStatus.trim();
        if (raw.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus is required"));
        }
        String normalized = raw.toLowerCase();
        if (!"active".equals(normalized) && !"suspended".equals(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus must be active or suspended"));
        }

        if (admin.getId() != null && admin.getId().equals(userId) && "suspended".equals(normalized)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "You cannot suspend your own administrator account while signed in."
            ));
        }

        Optional<UserAccount> targetOpt = userAccountRepository.findById(userId);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        UserAccount target = targetOpt.get();
        target.setAccountStatus(normalized);
        target.setUpdatedAt(LocalDateTime.now());
        UserAccount saved = userAccountRepository.save(target);
        return ResponseEntity.ok(Map.of("item", AdminUserRowResponse.from(saved)));
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<?> verifyUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer userId
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        try {
            UserAccount saved = verificationService.approveUser(userId);
            return ResponseEntity.ok(Map.of("item", AdminUserRowResponse.from(saved)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer userId,
            @RequestBody(required = false) AdminVerificationRejectRequest request
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        try {
            String reason = request != null ? request.reason : null;
            UserAccount saved = verificationService.rejectUser(userId, reason);
            return ResponseEntity.ok(Map.of("item", AdminUserRowResponse.from(saved)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/verifications/pending")
    public ResponseEntity<?> pendingVerifications(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        List<Map<String, Object>> items = verificationService.listPendingForAdmin();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", items.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/verifications/{userId}")
    public ResponseEntity<?> verificationDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("userId") Integer userId
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        try {
            return ResponseEntity.ok(Map.of("item", verificationService.adminDetail(userId)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/properties/pending")
    public ResponseEntity<?> pendingProperties(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        List<PropertyEntity> pending = propertyRepository.findAll().stream()
                .filter(p -> {
                    String st = p.getStatus() != null ? p.getStatus().trim().toLowerCase(Locale.ROOT) : "";
                    return "pending".equals(st) || "maintenance".equals(st);
                })
                .sorted((a, b) -> Integer.compare(
                        b.getId() != null ? b.getId() : 0,
                        a.getId() != null ? a.getId() : 0
                ))
                .collect(Collectors.toList());
        List<PropertyResponse> items = pending.stream().map(PropertyResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @PutMapping("/properties/{id}/verify")
    public ResponseEntity<?> verifyProperty(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer propertyId
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }
        Optional<PropertyEntity> propertyOpt = propertyRepository.findById(propertyId);
        if (propertyOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propertyOpt.get();
        property.setStatus("available");
        property.setUpdatedAt(LocalDateTime.now());
        PropertyEntity saved = propertyRepository.save(property);
        return ResponseEntity.ok(Map.of("item", PropertyResponse.fromEntity(saved)));
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        if (!"admin".equalsIgnoreCase(String.valueOf(user.getRole()))) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private static ResponseEntity<?> adminAuthError(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
