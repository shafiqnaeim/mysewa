package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.payment.DepositCalculator;
import com.mysewa.api.payment.DepositType;
import com.mysewa.api.payment.PaymentProperties;
import com.mysewa.api.payment.ToyyibPayService;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.IcCryptoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
@RequestMapping("/api/v1/applications")
@CrossOrigin
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final PropertyRepository propertyRepository;
    private final UserAccountRepository userAccountRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final AuthService authService;
    private final PaymentProperties paymentProperties;
    private final ToyyibPayService toyyibPayService;
    private final IcCryptoService icCryptoService;

    public ApplicationController(
            ApplicationRepository applicationRepository,
            PropertyRepository propertyRepository,
            UserAccountRepository userAccountRepository,
            FinancialTransactionRepository financialTransactionRepository,
            AuthService authService,
            PaymentProperties paymentProperties,
            ToyyibPayService toyyibPayService,
            IcCryptoService icCryptoService
    ) {
        this.applicationRepository = applicationRepository;
        this.propertyRepository = propertyRepository;
        this.userAccountRepository = userAccountRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.authService = authService;
        this.paymentProperties = paymentProperties;
        this.toyyibPayService = toyyibPayService;
        this.icCryptoService = icCryptoService;
    }

    private static final double AVG_DAYS_PER_MONTH = 365.25 / 12.0;
    /** Max calendar-day span allowed so rounded months never exceeds 120. */
    private static final long MAX_LEASE_DAY_SPAN = (long) Math.ceil(120 * AVG_DAYS_PER_MONTH);

    private static int leaseMonthsFromDaySpan(long leaseDays) {
        int m = (int) Math.round(leaseDays / AVG_DAYS_PER_MONTH);
        return Math.min(120, Math.max(1, m));
    }

    /**
     * Student creates a rental application. {@code message} is optional (no minimum length).
     */
    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ApplicationCreateRequest request
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }

        if (request == null || request.getPropertyId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "propertyId is required"));
        }
        if (!StringUtils.hasText(request.getPreferredMoveIn())) {
            return ResponseEntity.badRequest().body(Map.of("message", "preferredMoveIn (move-in date) is required"));
        }
        if (!StringUtils.hasText(request.getLeaseEndDate())) {
            return ResponseEntity.badRequest().body(Map.of("message", "leaseEndDate (lease end date) is required"));
        }
        LocalDate minMoveIn = LocalDate.now().plusMonths(1).withDayOfMonth(1);
        LocalDate moveInDate;
        try {
            moveInDate = LocalDate.parse(request.getPreferredMoveIn().trim());
            if (moveInDate.isBefore(minMoveIn)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message",
                        "Move-in must be on or after " + minMoveIn + " (first day of the next calendar month)."
                ));
            }
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "preferredMoveIn must be a date in yyyy-MM-dd form"));
        }
        LocalDate leaseEndDate;
        try {
            leaseEndDate = LocalDate.parse(request.getLeaseEndDate().trim());
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "leaseEndDate must be a date in yyyy-MM-dd form"));
        }
        if (!leaseEndDate.isAfter(moveInDate)) {
            return ResponseEntity.badRequest().body(Map.of("message", "leaseEndDate must be after preferredMoveIn"));
        }
        long leaseDaysLong = ChronoUnit.DAYS.between(moveInDate, leaseEndDate);
        if (leaseDaysLong < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lease must span at least one full day."));
        }
        if (leaseDaysLong > MAX_LEASE_DAY_SPAN) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lease length cannot exceed 120 months."));
        }
        int leaseDays = (int) leaseDaysLong;
        int leaseMonths = leaseMonthsFromDaySpan(leaseDaysLong);
        if (request.getLeaseMonths() != null) {
            int clientMonths = request.getLeaseMonths();
            if (clientMonths < 1 || clientMonths > 120) {
                return ResponseEntity.badRequest().body(Map.of("message", "leaseMonths must be between 1 and 120"));
            }
            if (Math.abs(clientMonths - leaseMonths) > 1) {
                return ResponseEntity.badRequest().body(Map.of("message", "leaseMonths does not match the selected dates"));
            }
        }

        Optional<PropertyEntity> propOpt = propertyRepository.findById(request.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() != null && property.getLandlordId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You cannot apply for your own listing"));
        }

        if (applicationRepository.existsByPropertyIdAndStudentId(request.getPropertyId(), student.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "You have already applied for this listing"));
        }

        Application app = new Application();
        app.setPropertyId(request.getPropertyId());
        app.setStudentId(student.getId());
        app.setPreferredMoveIn(trimToNull(request.getPreferredMoveIn()));
        app.setLeaseMonths(leaseMonths);
        app.setLeaseEnd(leaseEndDate.toString());
        app.setLeaseDays(leaseDays);
        app.setStatus("pending");
        LocalDateTime now = LocalDateTime.now();
        app.setCreatedAt(now);
        app.setUpdatedAt(now);

        try {
            Application saved = applicationRepository.save(app);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", ApplicationResponse.from(saved, property, student, icCryptoService)));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "You have already applied for this listing"));
        }
    }

    @GetMapping("/for-landlord")
    public ResponseEntity<?> listForLandlord(@RequestHeader(value = "Authorization", required = false) String authorization) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        List<PropertyEntity> mine = propertyRepository.findByLandlordIdOrderByUpdatedAtDesc(landlord.getId());
        List<Integer> propertyIds = mine.stream()
                .map(PropertyEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (propertyIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("items", List.of(), "count", 0));
        }

        Map<Integer, PropertyEntity> byId = new LinkedHashMap<>();
        for (PropertyEntity p : mine) {
            byId.put(p.getId(), p);
        }

        List<Application> applications = applicationRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds);
        List<Integer> appIds = applications.stream().map(Application::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Set<Integer> paidAppIds = new HashSet<>();
        if (!appIds.isEmpty()) {
            paidAppIds.addAll(financialTransactionRepository.findApplicationIdsWithCompletedDeposit(appIds));
        }

        List<ApplicationResponse> items = new ArrayList<>();
        for (Application a : applications) {
            PropertyEntity p = byId.get(a.getPropertyId());
            UserAccount studentUser = userAccountRepository.findById(a.getStudentId()).orElse(null);
            ApplicationResponse row = ApplicationResponse.from(a, p, studentUser, icCryptoService);
            row.depositPaid = paidAppIds.contains(a.getId());
            if (p != null) {
                String st = nullSafe(a.getStatus()).toLowerCase();
                if ("accepted".equals(st)) {
                    row.depositAmountSuggested = DepositCalculator.resolveForApplication(a, p);
                } else if ("pending".equals(st)) {
                    row.depositAmountSuggested = DepositCalculator.compute(p);
                }
            }
            items.add(row);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", items.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/for-student")
    public ResponseEntity<?> listForStudent(@RequestHeader(value = "Authorization", required = false) String authorization) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }

        List<Application> applications = applicationRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        List<Integer> appIds = applications.stream().map(Application::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Set<Integer> paidAppIds = new HashSet<>();
        if (!appIds.isEmpty()) {
            paidAppIds.addAll(financialTransactionRepository.findApplicationIdsWithCompletedDeposit(appIds));
        }

        List<ApplicationResponse> items = new ArrayList<>();
        for (Application a : applications) {
            PropertyEntity property = propertyRepository.findById(a.getPropertyId()).orElse(null);
            ApplicationResponse r = ApplicationResponse.from(a, property, student, icCryptoService);
            r.depositPaid = paidAppIds.contains(a.getId());
            String st = nullSafe(a.getStatus()).toLowerCase();
            if ("accepted".equals(st)) {
                r.depositAmountSuggested = DepositCalculator.resolveForApplication(a, property);
            } else if ("pending".equals(st) && property != null) {
                r.depositAmountSuggested = DepositCalculator.compute(property);
            }
            items.add(r);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", items.size());
        return ResponseEntity.ok(body);
    }

    @Transactional
    @RequestMapping(value = "/{id}/status", method = { RequestMethod.PATCH, RequestMethod.PUT })
    public ResponseEntity<?> updateStatusForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody ApplicationStatusUpdateRequest request
    ) {
        UserAccount landlord;
        try {
            landlord = requireLandlord(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }

        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        String rawStatus = request == null || request.getStatus() == null ? "" : request.getStatus().trim();
        if (rawStatus.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "status is required"));
        }
        String normalized = rawStatus.toLowerCase();
        if (!normalized.equals("accepted") && !normalized.equals("rejected")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "status must be accepted or rejected"
            ));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();

        String currentStatus = nullSafe(app.getStatus()).toLowerCase();
        if ("accepted".equals(currentStatus) || "rejected".equals(currentStatus)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "message",
                    "This application has already been decided and cannot be changed."
            ));
        }
        if (!"pending".equals(currentStatus)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "Only pending applications can be accepted or rejected."
            ));
        }

        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found for this application"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only update applications for your own listings"
            ));
        }

        if ("accepted".equals(normalized)) {
            if (request.getDepositAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "depositAmount is required when accepting an application"));
            }
            BigDecimal dep = request.getDepositAmount().setScale(2, RoundingMode.HALF_UP);
            if (!DepositCalculator.isValidLandlordDeposit(dep)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message",
                        "depositAmount must be between 100 and 5000 MYR (inclusive)."
                ));
            }
            app.setLandlordDepositAmount(dep);
        } else {
            app.setLandlordDepositAmount(null);
        }

        app.setStatus(normalized);
        app.setUpdatedAt(LocalDateTime.now());
        Application saved = applicationRepository.save(app);
        applicationRepository.flush();

        UserAccount studentUser = userAccountRepository.findById(saved.getStudentId()).orElse(null);
        ApplicationResponse item = ApplicationResponse.from(saved, property, studentUser, icCryptoService);
        item.depositPaid = financialTransactionRepository.hasCompletedDeposit(applicationId);
        if ("accepted".equals(normalized)) {
            item.depositAmountSuggested = DepositCalculator.resolveForApplication(saved, property);
        }
        return ResponseEntity.ok(Map.of("item", item));
    }

    @PostMapping("/{id}/mock-pay-deposit")
    public ResponseEntity<?> mockPayDeposit(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (!app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This application belongs to another student"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "The landlord must accept your application before you can pay the mock deposit."
            ));
        }
        if (financialTransactionRepository.hasCompletedDeposit(applicationId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Deposit has already been recorded for this application"));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();

        BigDecimal amount = DepositCalculator.resolveForApplication(app, property);

        FinancialTransaction tx = new FinancialTransaction();
        tx.setApplicationId(applicationId);
        tx.setStudentId(student.getId());
        tx.setPropertyId(property.getId());
        tx.setAmount(amount);
        tx.setCurrency("MYR");
        tx.setType(DepositType.MOCK);
        tx.setStatus("completed");
        LocalDateTime now = LocalDateTime.now();
        tx.setCreatedAt(now);
        FinancialTransaction savedTx = financialTransactionRepository.save(tx);

        ApplicationResponse item = ApplicationResponse.from(app, property, student, icCryptoService);
        item.depositPaid = true;
        item.depositAmountSuggested = amount;

        Map<String, Object> txMap = new LinkedHashMap<>();
        txMap.put("id", savedTx.getId());
        txMap.put("applicationId", savedTx.getApplicationId());
        txMap.put("propertyId", savedTx.getPropertyId());
        txMap.put("amount", savedTx.getAmount());
        txMap.put("currency", savedTx.getCurrency());
        txMap.put("type", savedTx.getType());
        txMap.put("status", savedTx.getStatus());
        txMap.put("createdAt", savedTx.getCreatedAt() != null ? DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(savedTx.getCreatedAt()) : null);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("transaction", txMap);
        body.put("item", item);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PostMapping("/{id}/deposit/manual")
    public ResponseEntity<?> depositManual(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody ManualDepositRequest body
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        String channel = body == null || body.getChannel() == null ? "" : body.getChannel().trim().toLowerCase(Locale.ROOT);
        String type;
        if ("bank_transfer".equals(channel)) {
            type = DepositType.BANK;
        } else if ("duitnow_qr".equals(channel) || "qr".equals(channel)) {
            type = DepositType.QR;
        } else if ("cash".equals(channel)) {
            type = DepositType.CASH;
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "channel must be bank_transfer, duitnow_qr, or cash"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (!app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This application belongs to another student"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "The landlord must accept your application before you can record a deposit."));
        }
        if (financialTransactionRepository.hasCompletedDeposit(applicationId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Deposit has already been recorded for this application"));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        BigDecimal amount = DepositCalculator.resolveForApplication(app, property);

        FinancialTransaction tx = new FinancialTransaction();
        tx.setApplicationId(applicationId);
        tx.setStudentId(student.getId());
        tx.setPropertyId(property.getId());
        tx.setAmount(amount);
        tx.setCurrency("MYR");
        tx.setType(type);
        tx.setStatus("completed");
        LocalDateTime now = LocalDateTime.now();
        tx.setCreatedAt(now);
        financialTransactionRepository.save(tx);

        ApplicationResponse item = ApplicationResponse.from(app, property, student, icCryptoService);
        item.depositPaid = true;
        item.depositAmountSuggested = amount;
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", item, "channel", channel));
    }

    @PostMapping("/{id}/deposit/toyyibpay")
    public ResponseEntity<?> depositToyyibPayInit(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }
        if (!paymentProperties.getToyyibpay().isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message",
                    "ToyyibPay is not configured. Set TOYYIBPAY_ENABLED=true, TOYYIBPAY_USER_SECRET_KEY, and TOYYIBPAY_CATEGORY_CODE (see docs)."
            ));
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (!app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This application belongs to another student"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "The landlord must accept your application before you can pay the deposit."));
        }
        if (financialTransactionRepository.hasCompletedDeposit(applicationId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Deposit has already been recorded for this application"));
        }

        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        BigDecimal amount = DepositCalculator.resolveForApplication(app, property);

        Optional<FinancialTransaction> existingPending = financialTransactionRepository
                .findTopByApplicationIdAndTypeAndStatusOrderByCreatedAtDesc(applicationId, DepositType.TOYYIBPAY, "pending");
        if (existingPending.isPresent() && StringUtils.hasText(existingPending.get().getExternalRef())) {
            String billCode = existingPending.get().getExternalRef();
            String payUrl = toyyibPayService.payBaseUrl() + billCode;
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("payUrl", payUrl);
            body.put("billCode", billCode);
            body.put("sandbox", paymentProperties.getToyyibpay().isSandbox());
            body.put("amount", amount);
            body.put("reusedPending", true);
            return ResponseEntity.ok(body);
        }

        String orderId = "MYSEWA-A-" + applicationId;
        String returnUrl = trimTrailingSlash(paymentProperties.getFrontReturnBase())
                + "/dashboard/student?deposit=return&applicationId=" + applicationId;
        String callbackUrl = trimTrailingSlash(paymentProperties.getPublicApiBaseUrl())
                + "/api/v1/payments/toyyibpay/callback";

        String billName = "MySewa_deposit_" + applicationId;
        String billDesc = "Rental_deposit_" + (property.getName() != null ? property.getName() : "property");
        try {
            String billCode = toyyibPayService.createBill(
                    amount,
                    orderId,
                    returnUrl,
                    callbackUrl,
                    student.getFullName(),
                    student.getEmail(),
                    student.getPhoneNumber(),
                    billName,
                    billDesc
            );

            FinancialTransaction tx = new FinancialTransaction();
            tx.setApplicationId(applicationId);
            tx.setStudentId(student.getId());
            tx.setPropertyId(property.getId());
            tx.setAmount(amount);
            tx.setCurrency("MYR");
            tx.setType(DepositType.TOYYIBPAY);
            tx.setStatus("pending");
            tx.setExternalRef(billCode);
            tx.setCreatedAt(LocalDateTime.now());
            financialTransactionRepository.save(tx);

            String payUrl = toyyibPayService.payBaseUrl() + billCode;
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("payUrl", payUrl);
            body.put("billCode", billCode);
            body.put("sandbox", paymentProperties.getToyyibpay().isSandbox());
            body.put("amount", amount);
            body.put("orderId", orderId);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "message",
                    ex.getMessage() != null ? ex.getMessage() : "ToyyibPay create bill failed"
            ));
        }
    }

    /**
     * Deletes all prototype deposit rows for this application so the student can run Pay deposit again.
     * Disabled unless {@code app.payment.dev-allow-deposit-reset=true} (env {@code MYSEWA_DEV_RESET_DEPOSIT}).
     */
    @PostMapping("/{id}/deposit/reset-for-testing")
    @Transactional
    public ResponseEntity<?> resetDepositForTesting(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
    ) {
        if (!paymentProperties.isDevAllowDepositReset()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "Deposit reset is disabled. For local testing only, set MYSEWA_DEV_RESET_DEPOSIT=true on the API and restart."
            ));
        }
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrMessage(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (!app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This application belongs to another student"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Only accepted applications can reset deposit state."
            ));
        }
        financialTransactionRepository.deleteByApplicationIdAndTypeIn(applicationId, DepositType.COMPLETED_DEPOSIT_TYPES);

        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        PropertyEntity property = propOpt.orElse(null);
        BigDecimal amount = property != null ? DepositCalculator.resolveForApplication(app, property) : null;
        ApplicationResponse item = ApplicationResponse.from(app, property, student, icCryptoService);
        item.depositPaid = financialTransactionRepository.hasCompletedDeposit(applicationId);
        item.depositAmountSuggested = amount;
        return ResponseEntity.ok(Map.of("item", item));
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isEmpty()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    @GetMapping(value = "/{id}/agreement", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> rentalAgreementHtml(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
    ) {
        if (applicationId == null) {
            return ResponseEntity.badRequest().contentType(MediaType.TEXT_HTML).body("<p>Missing application id.</p>");
        }
        UserAccount viewer;
        try {
            viewer = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).contentType(MediaType.TEXT_HTML).body("<p>Please sign in.</p>");
        }
        String role = nullSafe(viewer.getRole()).toLowerCase();
        if (!"student".equals(role) && !"landlord".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).contentType(MediaType.TEXT_HTML).body("<p>Access denied.</p>");
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_HTML).body("<p>Application not found.</p>");
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_HTML).body("<p>Property not found.</p>");
        }
        PropertyEntity property = propOpt.get();

        if ("student".equals(role)) {
            if (!viewer.getId().equals(app.getStudentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).contentType(MediaType.TEXT_HTML).body("<p>Access denied.</p>");
            }
        } else {
            if (property.getLandlordId() == null || !property.getLandlordId().equals(viewer.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).contentType(MediaType.TEXT_HTML).body("<p>Access denied.</p>");
            }
        }

        UserAccount stu = userAccountRepository.findById(app.getStudentId()).orElse(null);
        UserAccount land = property.getLandlordId() != null
                ? userAccountRepository.findById(property.getLandlordId()).orElse(null)
                : null;

        String html = buildAgreementHtml(property, stu, land, app);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    private static String buildAgreementHtml(PropertyEntity property, UserAccount student, UserAccount landlord, Application app) {
        String propName = escapeHtml(property.getName() != null ? property.getName() : "Property");
        String studentName = escapeHtml(student != null && student.getFullName() != null ? student.getFullName() : "Tenant");
        String landlordName = escapeHtml(landlord != null && landlord.getFullName() != null ? landlord.getFullName() : "Landlord");
        String addr = escapeHtml(property.getLocation() != null ? property.getLocation() : "");
        String when = DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(LocalDateTime.now());
        return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Rental agreement (prototype)</title>"
                + "<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:2rem auto;line-height:1.5;color:#222}"
                + "h1{font-size:1.25rem} .box{border:1px solid #ddd;padding:1rem;border-radius:8px;background:#fafafa}</style></head><body>"
                + "<h1>MySewa — rental agreement (prototype)</h1>"
                + "<p>This document is generated for demonstration only and is <strong>not</strong> legal advice or a binding contract.</p>"
                + "<div class=\"box\">"
                + "<p><strong>Property:</strong> " + propName + "</p>"
                + "<p><strong>Address:</strong> " + addr + "</p>"
                + "<p><strong>Tenant (student):</strong> " + studentName + "</p>"
                + "<p><strong>Landlord:</strong> " + landlordName + "</p>"
                + "<p><strong>Application id:</strong> " + app.getId() + "</p>"
                + "<p><strong>Move-in (requested):</strong> " + escapeHtml(app.getPreferredMoveIn() != null ? app.getPreferredMoveIn() : "—") + "</p>"
                + "<p><strong>Move-out / lease end:</strong> " + escapeHtml(app.getLeaseEnd() != null ? app.getLeaseEnd() : "—") + "</p>"
                + "<p><strong>Generated:</strong> " + escapeHtml(when) + "</p>"
                + "<p>The parties acknowledge that rent, deposit, and tenancy terms on MySewa are prototypes for academic evaluation.</p>"
                + "</div></body></html>";
    }

    private static String escapeHtml(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static ResponseEntity<?> unauthorizedOrMessage(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }

    private static ResponseEntity<?> unauthorizedOrForbidden(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"student".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only student accounts can submit rental applications");
        }
        return u;
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"landlord".equalsIgnoreCase(nullSafe(u.getRole()))) {
            throw new IllegalArgumentException("Only landlord accounts can view incoming applications");
        }
        return u;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
