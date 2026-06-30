package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.payment.DepositType;
import com.mysewa.api.payment.PaymentProperties;
import com.mysewa.api.payment.ToyyibPayService;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Payment instructions, ToyyibPay callback, and authenticated payment ledger access.
 */
@RestController
@RequestMapping({"/api/v1/payments", "/api/payments"})
@CrossOrigin
public class PaymentController {

    private final PaymentProperties paymentProperties;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ToyyibPayService toyyibPayService;
    private final AuthService authService;
    private final ApplicationRepository applicationRepository;
    private final PropertyRepository propertyRepository;
    private final UserAccountRepository userAccountRepository;
    private final BookingService bookingService;

    public PaymentController(
            PaymentProperties paymentProperties,
            FinancialTransactionRepository financialTransactionRepository,
            ToyyibPayService toyyibPayService,
            AuthService authService,
            ApplicationRepository applicationRepository,
            PropertyRepository propertyRepository,
            UserAccountRepository userAccountRepository,
            BookingService bookingService
    ) {
        this.paymentProperties = paymentProperties;
        this.financialTransactionRepository = financialTransactionRepository;
        this.toyyibPayService = toyyibPayService;
        this.authService = authService;
        this.applicationRepository = applicationRepository;
        this.propertyRepository = propertyRepository;
        this.userAccountRepository = userAccountRepository;
        this.bookingService = bookingService;
    }

    @GetMapping("/manual-instructions")
    public ResponseEntity<Map<String, Object>> manualInstructions() {
        PaymentProperties.Manual m = paymentProperties.getManual();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("bankName", m.getBankName());
        body.put("bankAccount", m.getBankAccount());
        body.put("bankHolder", m.getBankHolder());
        body.put("qrImageUrl", StringUtils.hasText(m.getQrImageUrl()) ? m.getQrImageUrl() : null);
        body.put("note", "Transfer the deposit amount shown on MySewa, then confirm in the app. QR/Cash are prototype flows for FYP.");
        return ResponseEntity.ok(body);
    }

    @GetMapping("/toyyibpay/options")
    public ResponseEntity<Map<String, Object>> toyyibOptions() {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        Map<String, Object> body = new LinkedHashMap<>();
        boolean configured = tp.isConfigured();
        body.put("enabled", configured);
        body.put("sandbox", tp.isSandbox());
        if (!configured) {
            String hint;
            if (!tp.isEnabled()) {
                hint = "Set TOYYIBPAY_ENABLED=true on the Spring API process, then restart.";
            } else if (!StringUtils.hasText(tp.getUserSecretKey())) {
                hint = "Set TOYYIBPAY_USER_SECRET_KEY on the Spring API process (IDE env or shell), then restart.";
            } else if (!StringUtils.hasText(tp.getCategoryCode())) {
                hint = "Set TOYYIBPAY_CATEGORY_CODE on the Spring API process, then restart.";
            } else {
                hint = "ToyyibPay is not fully configured.";
            }
            body.put("setupHint", hint);
        }
        body.put("depositResetAllowed", paymentProperties.isDevAllowDepositReset());
        return ResponseEntity.ok(body);
    }

    @PostMapping(value = "/toyyibpay/callback")
    public ResponseEntity<String> toyyibPayCallback(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "order_id", required = false) String orderId,
            @RequestParam(value = "refno", required = false) String refno,
            @RequestParam(value = "hash", required = false) String receivedHash,
            @RequestParam(value = "billcode", required = false) String billcode
    ) {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        if (!tp.isConfigured()) {
            return ResponseEntity.status(503).body("NOT_CONFIGURED");
        }
        String secret = tp.getUserSecretKey().trim();
        String st = status == null ? "" : status.trim();
        String oid = orderId == null ? "" : orderId.trim();
        String rf = refno == null ? "" : refno.trim();
        String expected = ToyyibPayService.expectedCallbackHash(secret, st, oid, rf);
        String got = receivedHash == null ? "" : receivedHash.trim().toLowerCase(Locale.ROOT);
        if (!expected.equalsIgnoreCase(got)) {
            return ResponseEntity.badRequest().body("BAD_HASH");
        }
        if (!"1".equals(st)) {
            return ResponseEntity.ok("IGNORED_STATUS");
        }
        String bc = billcode == null ? "" : billcode.trim();
        if (!StringUtils.hasText(bc)) {
            return ResponseEntity.badRequest().body("MISSING_BILLCODE");
        }
        Optional<FinancialTransaction> opt = financialTransactionRepository.findByExternalRefAndTypeAndStatus(
                bc,
                DepositType.TOYYIBPAY,
                "pending"
        );
        if (opt.isEmpty()) {
            opt = financialTransactionRepository.findByExternalRefAndTypeAndStatus(
                    bc,
                    DepositType.RENT_TOYYIBPAY,
                    "pending"
            );
        }
        if (opt.isEmpty()) {
            return ResponseEntity.ok("NO_PENDING");
        }
        FinancialTransaction tx = opt.get();
        if ("completed".equalsIgnoreCase(tx.getStatus())) {
            return ResponseEntity.ok("ALREADY_DONE");
        }
        tx.setStatus("completed");
        financialTransactionRepository.save(tx);
        if (DepositType.COMPLETED_DEPOSIT_TYPES.contains(tx.getType())) {
            applicationRepository.findById(tx.getApplicationId()).ifPresent(app ->
                    propertyRepository.findById(app.getPropertyId()).ifPresent(property ->
                            bookingService.onDepositConfirmed(app, property)));
        }
        return ResponseEntity.ok("OK");
    }

    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body
    ) {
        UserAccount actor;
        try {
            actor = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        Integer applicationId = body != null && body.get("applicationId") != null
                ? Integer.valueOf(String.valueOf(body.get("applicationId")))
                : body != null && body.get("bookingId") != null
                ? Integer.valueOf(String.valueOf(body.get("bookingId")))
                : null;
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "applicationId (bookingId) is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }
        Application app = appOpt.get();
        if (actor.getId() == null || !actor.getId().equals(app.getStudentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }
        PropertyEntity property = propertyRepository.findById(app.getPropertyId()).orElse(null);
        BigDecimal amount = body.get("amount") != null
                ? new BigDecimal(String.valueOf(body.get("amount")))
                : BigDecimal.ZERO;
        String type = body.get("type") != null ? String.valueOf(body.get("type")).trim() : DepositType.MOCK;
        FinancialTransaction tx = new FinancialTransaction();
        tx.setApplicationId(applicationId);
        tx.setStudentId(app.getStudentId());
        tx.setPropertyId(app.getPropertyId());
        tx.setAmount(amount);
        tx.setCurrency("MYR");
        tx.setType(type.isEmpty() ? DepositType.MOCK : type);
        tx.setStatus("completed");
        tx.setCreatedAt(LocalDateTime.now());
        FinancialTransaction saved = financialTransactionRepository.save(tx);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", toPaymentItem(saved, property)));
    }

    @GetMapping({"/booking/{bookingId}", "/application/{bookingId}"})
    public ResponseEntity<?> listByBooking(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("bookingId") Integer bookingId
    ) {
        try {
            authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        List<Map<String, Object>> items = financialTransactionRepository.findByApplicationIdOrderByCreatedAtDesc(bookingId)
                .stream()
                .map(tx -> toPaymentItem(tx, null))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @GetMapping("/user")
    public ResponseEntity<?> listForUser(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        List<Map<String, Object>> items = financialTransactionRepository.findByStudentIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(tx -> toPaymentItem(tx, null))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @GetMapping("/landlord")
    public ResponseEntity<?> listForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }

        List<PropertyEntity> properties = propertyRepository.findByLandlordIdOrderByUpdatedAtDesc(landlord.getId());
        List<Integer> propertyIds = properties.stream()
                .map(PropertyEntity::getId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (propertyIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("items", List.of(), "count", 0));
        }

        Map<Integer, PropertyEntity> propertyById = new LinkedHashMap<>();
        for (PropertyEntity p : properties) {
            propertyById.put(p.getId(), p);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (FinancialTransaction tx : financialTransactionRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds)) {
            PropertyEntity property = propertyById.get(tx.getPropertyId());
            UserAccount student = userAccountRepository.findById(tx.getStudentId()).orElse(null);
            Map<String, Object> item = toPaymentItem(tx, property);
            if (student != null && student.getFullName() != null) {
                item.put("studentName", student.getFullName().trim());
            }
            items.add(item);
        }

        return ResponseEntity.ok(Map.of("items", items, "count", items.size()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id,
            @RequestBody Map<String, String> body
    ) {
        UserAccount admin;
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (body == null || !StringUtils.hasText(body.get("status"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "status is required"));
        }
        Optional<FinancialTransaction> txOpt = financialTransactionRepository.findById(id);
        if (txOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Payment not found"));
        }
        FinancialTransaction tx = txOpt.get();
        tx.setStatus(body.get("status").trim().toLowerCase(Locale.ROOT));
        FinancialTransaction saved = financialTransactionRepository.save(tx);
        return ResponseEntity.ok(Map.of("item", toPaymentItem(saved, null)));
    }

    private static Map<String, Object> toPaymentItem(FinancialTransaction tx, PropertyEntity property) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", tx.getId());
        item.put("applicationId", tx.getApplicationId());
        item.put("bookingId", tx.getApplicationId());
        item.put("studentId", tx.getStudentId());
        item.put("propertyId", tx.getPropertyId());
        item.put("amount", tx.getAmount());
        item.put("currency", tx.getCurrency());
        item.put("type", tx.getType());
        item.put("status", tx.getStatus());
        item.put("createdAt", tx.getCreatedAt());
        if (property != null) {
            item.put("propertyName", property.getName());
        }
        return item;
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount user = authService.me(authorization);
        String role = user.getRole() != null ? user.getRole().toLowerCase(Locale.ROOT) : "";
        if (!"landlord".equals(role)) {
            throw new IllegalArgumentException("Only landlord accounts can access this resource");
        }
        return user;
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        String role = user.getRole() != null ? user.getRole().toLowerCase(Locale.ROOT) : "";
        if (!"admin".equals(role)) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private ResponseEntity<Map<String, String>> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() != null ? ex.getMessage() : "Unauthorized";
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("not found")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
