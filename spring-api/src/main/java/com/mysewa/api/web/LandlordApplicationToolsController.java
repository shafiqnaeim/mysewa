package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.ApplicationRentMonthRecord;
import com.mysewa.api.domain.ApplicationRentMonthStudentLog;
import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.payment.DepositCalculator;
import com.mysewa.api.payment.DepositType;
import com.mysewa.api.payment.PaymentProperties;
import com.mysewa.api.payment.ToyyibPayService;
import com.mysewa.api.repo.ApplicationRentMonthRecordRepository;
import com.mysewa.api.repo.ApplicationRentMonthStudentLogRepository;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.AvailabilityService;
import com.mysewa.api.service.BookingService;
import com.mysewa.api.service.NotificationService;
import com.mysewa.api.service.PaymentLogService;
import com.mysewa.api.service.IcCryptoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Landlord tools for deposit and monthly rent records; the accepted student may GET the same rent calendar (read-only).
 */
@RestController
@RequestMapping("/api/v1/applications")
@CrossOrigin
public class LandlordApplicationToolsController {

    private static final String STUDENT_BLOCKED_LANDLORD_RENT_ACTION = "STUDENT_BLOCKED_LANDLORD_RENT_ACTION";

    private static final String MONTH_STATE_RECEIVED = "received";
    private static final String MONTH_STATE_PENDING = "pending";
    private static final String MONTH_STATE_UNAVAILABLE = "unavailable";

    private static final BigDecimal RENT_AMOUNT_MIN = new BigDecimal("1.00");
    private static final BigDecimal RENT_AMOUNT_MAX = new BigDecimal("999999.99");

    private static final java.util.Set<String> RENT_PAYMENT_CHANNELS = java.util.Set.of(
            "rent_auto",
            "bank_transfer",
            "duitnow_qr",
            "cash",
            "toyyibpay_link",
            "other"
    );

    private static final java.util.Set<String> STUDENT_RENT_PAYMENT_METHODS = java.util.Set.of(
            "cash",
            "bank_transfer",
            "duitnow_qr",
            "toyyibpay"
    );

    private final AuthService authService;
    private final ApplicationRepository applicationRepository;
    private final PropertyRepository propertyRepository;
    private final UserAccountRepository userAccountRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ApplicationRentMonthRecordRepository rentMonthRecordRepository;
    private final ApplicationRentMonthStudentLogRepository rentMonthStudentLogRepository;
    private final PaymentProperties paymentProperties;
    private final ToyyibPayService toyyibPayService;
    private final IcCryptoService icCryptoService;
    private final BookingService bookingService;
    private final AvailabilityService availabilityService;
    private final NotificationService notificationService;
    private final PaymentLogService paymentLogService;

    public LandlordApplicationToolsController(
            AuthService authService,
            ApplicationRepository applicationRepository,
            PropertyRepository propertyRepository,
            UserAccountRepository userAccountRepository,
            FinancialTransactionRepository financialTransactionRepository,
            ApplicationRentMonthRecordRepository rentMonthRecordRepository,
            ApplicationRentMonthStudentLogRepository rentMonthStudentLogRepository,
            PaymentProperties paymentProperties,
            ToyyibPayService toyyibPayService,
            IcCryptoService icCryptoService,
            BookingService bookingService,
            AvailabilityService availabilityService,
            NotificationService notificationService,
            PaymentLogService paymentLogService
    ) {
        this.authService = authService;
        this.applicationRepository = applicationRepository;
        this.propertyRepository = propertyRepository;
        this.userAccountRepository = userAccountRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.rentMonthRecordRepository = rentMonthRecordRepository;
        this.rentMonthStudentLogRepository = rentMonthStudentLogRepository;
        this.paymentProperties = paymentProperties;
        this.toyyibPayService = toyyibPayService;
        this.icCryptoService = icCryptoService;
        this.bookingService = bookingService;
        this.availabilityService = availabilityService;
        this.notificationService = notificationService;
        this.paymentLogService = paymentLogService;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private UserAccount requireLandlord(String authorization) {
        UserAccount u = authService.me(authorization);
        String role = normalizedRole(u);
        if ("student".equals(role)) {
            throw new IllegalArgumentException(STUDENT_BLOCKED_LANDLORD_RENT_ACTION);
        }
        if (!"landlord".equals(role)) {
            throw new IllegalArgumentException("Only landlord accounts can use this action");
        }
        return u;
    }

    private UserAccount requireStudent(String authorization) {
        UserAccount u = authService.me(authorization);
        if (!"student".equals(normalizedRole(u))) {
            throw new IllegalArgumentException("Only student accounts can use this action");
        }
        return u;
    }

    private static String normalizedRole(UserAccount u) {
        if (u == null || u.getRole() == null) {
            return "";
        }
        return u.getRole().trim().toLowerCase(Locale.ROOT);
    }

    private static ResponseEntity<?> unauthorizedOrForbidden(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (STUDENT_BLOCKED_LANDLORD_RENT_ACTION.equals(m)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "That action is for your landlord only. As the student, use myProperty: Pay deposit for the tenancy "
                            + "deposit, and under Monthly rent calendar use I've sent this month's rent when you have paid rent."
            ));
        }
        if (m.contains("token") || m.contains("Missing bearer")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }

    /**
     * Landlord records that the tenancy deposit has been received (adds a completed ledger row).
     */
    @PostMapping("/{id}/deposit/landlord-mark-paid")
    @Transactional
    public ResponseEntity<?> landlordMarkDepositPaid(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
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
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Only accepted applications can have deposit marked paid."
            ));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update applications for your own listings"));
        }
        if (financialTransactionRepository.hasCompletedDeposit(applicationId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Deposit is already marked paid for this application."));
        }
        BigDecimal amount = DepositCalculator.resolveForApplication(app, property);
        FinancialTransaction tx = new FinancialTransaction();
        tx.setApplicationId(applicationId);
        tx.setStudentId(app.getStudentId());
        tx.setPropertyId(property.getId());
        tx.setAmount(amount);
        tx.setCurrency("MYR");
        tx.setType(DepositType.LANDLORD_MARKED);
        tx.setStatus("completed");
        LocalDateTime now = LocalDateTime.now();
        tx.setCreatedAt(now);
        financialTransactionRepository.save(tx);
        bookingService.onDepositConfirmed(app, property);

        UserAccount student = userAccountRepository.findById(app.getStudentId()).orElse(null);
        ApplicationResponse item = ApplicationResponse.from(app, property, student, icCryptoService);
        ApplicationDepositEnricher.apply(item, app, property, true);
        return ResponseEntity.ok(Map.of("item", item));
    }

    @GetMapping("/{id}/rent-months")
    public ResponseEntity<?> listRentMonthsForLandlord(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestParam(value = "year", required = false) Integer year
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        int y = year != null ? year : LocalDateTime.now().getYear();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        String role = normalizedRole(user);
        boolean landlordOk = "landlord".equals(role)
                && property.getLandlordId() != null
                && property.getLandlordId().equals(user.getId());
        boolean studentOk = "student".equals(role)
                && app.getStudentId() != null
                && app.getStudentId().equals(user.getId());
        if (!landlordOk && !studentOk) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only view this rent calendar as the landlord for this listing or the student on this application."
            ));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent calendar is only available for accepted applications."
            ));
        }
        UserAccount student = userAccountRepository.findById(app.getStudentId()).orElse(null);
        String studentName = student != null && student.getFullName() != null ? student.getFullName().trim() : "Student";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("applicationId", applicationId);
        body.put("propertyId", property.getId());
        body.put("propertyName", property.getName());
        body.put("studentName", studentName);
        body.put("applicationStatus", app.getStatus());
        body.put("monthlyRent", property.getPrice());
        body.put("preferredMoveIn", trimToNull(app.getPreferredMoveIn()));
        body.put("leaseEnd", trimToNull(app.getLeaseEnd()));
        body.put("leaseEndDate", trimToNull(app.getLeaseEnd()));
        body.putAll(buildRentYearStateBody(applicationId, y));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}/calendar")
    public ResponseEntity<?> bookingCalendar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        String role = normalizedRole(user);
        boolean landlordOk = "landlord".equals(role)
                && property.getLandlordId() != null
                && property.getLandlordId().equals(user.getId());
        boolean studentOk = "student".equals(role)
                && app.getStudentId() != null
                && app.getStudentId().equals(user.getId());
        if (!landlordOk && !studentOk) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message",
                    "You can only view this calendar as the landlord for this listing or the student on this application."
            ));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Booking calendar is only available for accepted applications."
            ));
        }
        return ResponseEntity.ok(availabilityService.bookingCalendarPayload(app, property));
    }

    private Map<String, Object> buildRentYearStateBody(Integer applicationId, int y) {
        List<ApplicationRentMonthRecord> rows =
                rentMonthRecordRepository.findByApplicationIdAndRentYearOrderByRentMonthAsc(applicationId, y);
        List<Integer> paidMonths = new ArrayList<>();
        List<Integer> pendingMonths = new ArrayList<>();
        List<Integer> unavailableMonths = new ArrayList<>();
        List<Map<String, Object>> rentMonthRecords = new ArrayList<>();
        for (ApplicationRentMonthRecord r : rows) {
            String state = normalizeMonthState(r.getMonthState());
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("month", r.getRentMonth());
            one.put("amount", r.getAmount());
            one.put("channel", r.getPaymentChannel());
            one.put("monthState", state);
            if (r.getRecordedAt() != null) {
                one.put("recordedAt", DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(r.getRecordedAt()));
            }
            rentMonthRecords.add(one);
            if (MONTH_STATE_UNAVAILABLE.equals(state)) {
                unavailableMonths.add(r.getRentMonth());
            } else if (MONTH_STATE_PENDING.equals(state)) {
                pendingMonths.add(r.getRentMonth());
            } else {
                paidMonths.add(r.getRentMonth());
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("year", y);
        out.put("paidMonths", paidMonths);
        out.put("pendingMonths", pendingMonths);
        out.put("unavailableMonths", unavailableMonths);
        out.put("rentMonthRecords", rentMonthRecords);
        List<Integer> studentLoggedMonths = new ArrayList<>();
        List<Map<String, Object>> studentRentPaymentLogs = new ArrayList<>();
        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        for (ApplicationRentMonthStudentLog lg : rentMonthStudentLogRepository.findByApplicationIdAndRentYearOrderByRentMonthAsc(
                applicationId,
                y
        )) {
            studentLoggedMonths.add(lg.getRentMonth());
            Map<String, Object> slog = new LinkedHashMap<>();
            slog.put("month", lg.getRentMonth());
            slog.put("paymentMethod", lg.getPaymentMethod());
            slog.put("receiptUrl", lg.getReceiptUrl());
            slog.put("loggedAt", lg.getLoggedAt() != null ? iso.format(lg.getLoggedAt()) : null);
            studentRentPaymentLogs.add(slog);
        }
        out.put("studentPaymentLoggedMonths", studentLoggedMonths);
        out.put("studentRentPaymentLogs", studentRentPaymentLogs);
        return out;
    }

    private static String normalizeMonthState(String raw) {
        if (!StringUtils.hasText(raw)) {
            return MONTH_STATE_RECEIVED;
        }
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (MONTH_STATE_UNAVAILABLE.equals(t)) {
            return MONTH_STATE_UNAVAILABLE;
        }
        if (MONTH_STATE_PENDING.equals(t) || "unpaid".equals(t)) {
            return MONTH_STATE_PENDING;
        }
        return MONTH_STATE_RECEIVED;
    }

    @PostMapping("/{id}/rent-months/mark-paid")
    @Transactional
    public ResponseEntity<?> markRentMonthPaid(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthMarkPaidRequest body
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
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        if (m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "month must be between 1 and 12"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update rent tracking for your own listings"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent calendar is only available for accepted applications."
            ));
        }

        Optional<LocalDate[]> leaseBounds = parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This application is missing valid move-in and lease-end dates; rent months cannot be updated."
            ));
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(y, m, moveIn, moveOut)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "That month is outside the tenancy period (from move-in through lease end)."
            ));
        }

        BigDecimal amt;
        if (body.getAmount() != null) {
            amt = body.getAmount().setScale(2, RoundingMode.HALF_UP);
        } else {
            if (property.getPrice() != null && property.getPrice() > 0) {
                amt = BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP);
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "message",
                        "This listing has no monthly rent on file. Enter an amount, or set the property price on My properties."
                ));
            }
        }
        if (amt.compareTo(RENT_AMOUNT_MIN) < 0 || amt.compareTo(RENT_AMOUNT_MAX) > 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "amount must be between RM 1.00 and RM 999,999.99"
            ));
        }

        String rawChannel = body.getChannel() == null || !StringUtils.hasText(body.getChannel())
                ? "rent_auto"
                : body.getChannel().trim().toLowerCase(java.util.Locale.ROOT);
        if (!RENT_PAYMENT_CHANNELS.contains(rawChannel)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "channel must be one of: rent_auto, bank_transfer, duitnow_qr, cash, toyyibpay_link, other"
            ));
        }

        Optional<ApplicationRentMonthRecord> existingOpt =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(applicationId, y, m);
        ApplicationRentMonthRecord row = existingOpt.orElseGet(ApplicationRentMonthRecord::new);
        if (existingOpt.isEmpty()) {
            row.setApplicationId(applicationId);
            row.setRentYear(y);
            row.setRentMonth(m);
        }
        row.setAmount(amt);
        row.setPaymentChannel(rawChannel);
        row.setMonthState(MONTH_STATE_RECEIVED);
        row.setRecordedAt(LocalDateTime.now());
        rentMonthRecordRepository.save(row);

        return ResponseEntity.ok(buildRentYearStateBody(applicationId, y));
    }

    /**
     * Landlord marks a month as not expecting rent (e.g. gap month, agreed waiver). Special-case; distinct from paid.
     */
    @PostMapping("/{id}/rent-months/mark-unavailable")
    @Transactional
    public ResponseEntity<?> markRentMonthUnavailable(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthToggleRequest body
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
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        if (m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "month must be between 1 and 12"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update rent tracking for your own listings"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent calendar is only available for accepted applications."
            ));
        }

        Optional<LocalDate[]> leaseBounds = parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This application is missing valid move-in and lease-end dates; rent months cannot be updated."
            ));
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(y, m, moveIn, moveOut)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "That month is outside the tenancy period (from move-in through lease end)."
            ));
        }

        Optional<ApplicationRentMonthRecord> existingOpt =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(applicationId, y, m);
        ApplicationRentMonthRecord row = existingOpt.orElseGet(ApplicationRentMonthRecord::new);
        if (existingOpt.isEmpty()) {
            row.setApplicationId(applicationId);
            row.setRentYear(y);
            row.setRentMonth(m);
        }
        row.setMonthState(MONTH_STATE_UNAVAILABLE);
        row.setAmount(null);
        row.setPaymentChannel(null);
        row.setRecordedAt(LocalDateTime.now());
        rentMonthRecordRepository.save(row);

        return ResponseEntity.ok(buildRentYearStateBody(applicationId, y));
    }

    @PostMapping("/{id}/rent-months/clear")
    @Transactional
    public ResponseEntity<?> clearRentMonth(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthToggleRequest body
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
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        if (m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "month must be between 1 and 12"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update rent tracking for your own listings"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent calendar is only available for accepted applications."
            ));
        }

        Optional<LocalDate[]> leaseBounds = parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This application is missing valid move-in and lease-end dates; rent months cannot be updated."
            ));
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(y, m, moveIn, moveOut)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "That month is outside the tenancy period (from move-in through lease end)."
            ));
        }

        Optional<ApplicationRentMonthRecord> existing =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(applicationId, y, m);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No rent record exists for that month."));
        }
        rentMonthRecordRepository.delete(existing.get());

        return ResponseEntity.ok(buildRentYearStateBody(applicationId, y));
    }

    @PostMapping(value = "/{id}/rent-months/receipt-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> uploadRentReceipt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestPart("file") MultipartFile file
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (app.getStudentId() == null || !app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update your own applications."));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent receipts are only available for accepted applications."
            ));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Choose a file to upload"));
        }
        String ct = file.getContentType();
        if (ct == null || !(ct.startsWith("image/") || "application/pdf".equalsIgnoreCase(ct))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Receipt must be an image (JPG, PNG, …) or a PDF"));
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is too large (max 10 MB)"));
        }
        try {
            Path dir = Path.of("uploads", "rent-receipts", String.valueOf(applicationId));
            Files.createDirectories(dir);
            String name = UUID.randomUUID().toString().replace("-", "") + "_" + safeReceiptFilename(file.getOriginalFilename());
            Path target = dir.resolve(name);
            file.transferTo(target);
            String url = "/uploads/rent-receipts/" + applicationId + "/" + name;
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message",
                    ex.getMessage() != null ? ex.getMessage() : "Upload failed"
            ));
        }
    }

    @PostMapping("/{id}/rent-months/toyyibpay-init")
    @Transactional
    public ResponseEntity<?> rentToyyibPayInit(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthToggleRequest body
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (!paymentProperties.getToyyibpay().isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message",
                    "ToyyibPay is not configured. Set TOYYIBPAY_ENABLED=true, TOYYIBPAY_USER_SECRET_KEY, and TOYYIBPAY_CATEGORY_CODE."
            ));
        }
        if (applicationId == null || body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100 || m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid year or month"));
        }
        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (app.getStudentId() == null || !app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update your own applications."));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent payment is only available for accepted applications."
            ));
        }
        Optional<LocalDate[]> leaseBounds = parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This application is missing valid move-in and lease-end dates."
            ));
        }
        if (!yearMonthWithinLease(y, m, leaseBounds.get()[0], leaseBounds.get()[1])) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "That month is outside the tenancy period."
            ));
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getPrice() == null || property.getPrice() <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This listing has no monthly rent on file — ToyyibPay cannot create a bill."
            ));
        }
        BigDecimal amount = BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(RENT_AMOUNT_MIN) < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rent amount is too small for ToyyibPay."));
        }

        Optional<FinancialTransaction> existingPending = financialTransactionRepository
                .findTopByApplicationIdAndTypeAndStatusOrderByCreatedAtDesc(applicationId, DepositType.RENT_TOYYIBPAY, "pending");
        if (existingPending.isPresent() && StringUtils.hasText(existingPending.get().getExternalRef())) {
            String billCode = existingPending.get().getExternalRef();
            String payUrl = toyyibPayService.payBaseUrl() + billCode;
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("payUrl", payUrl);
            out.put("billCode", billCode);
            out.put("sandbox", paymentProperties.getToyyibpay().isSandbox());
            out.put("amount", amount);
            out.put("reusedPending", true);
            return ResponseEntity.ok(out);
        }

        String orderId = "R" + applicationId + "Y" + y + "M" + m;
        String returnUrl = trimTrailingSlash(paymentProperties.getFrontReturnBase())
                + "/dashboard/student/property?rentToyyibReturn=1&applicationId=" + applicationId + "&year=" + y + "&month=" + m;
        String callbackUrl = trimTrailingSlash(paymentProperties.getPublicApiBaseUrl())
                + "/api/v1/payments/toyyibpay/callback";
        String billName = "MySewa_rent_" + applicationId;
        String billDesc = "Rent_" + y + "_" + m + "_" + (property.getName() != null ? property.getName() : "property");
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
            tx.setType(DepositType.RENT_TOYYIBPAY);
            tx.setStatus("pending");
            tx.setExternalRef(billCode);
            tx.setCreatedAt(LocalDateTime.now());
            financialTransactionRepository.save(tx);
            String payUrl = toyyibPayService.payBaseUrl() + billCode;
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("payUrl", payUrl);
            out.put("billCode", billCode);
            out.put("sandbox", paymentProperties.getToyyibpay().isSandbox());
            out.put("amount", amount);
            out.put("orderId", orderId);
            return ResponseEntity.status(HttpStatus.CREATED).body(out);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "message",
                    ex.getMessage() != null ? ex.getMessage() : "ToyyibPay create bill failed"
            ));
        }
    }

    /**
     * Student records that they have sent rent for a month (personal tracking). Does not mark the month paid for the landlord.
     */
    @PostMapping("/{id}/rent-months/student-payment-log")
    @Transactional
    public ResponseEntity<?> studentLogRentPaymentSent(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody StudentRentPaymentLogRequest body
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        try {
            Map<String, Object> result = paymentLogService.logStudentRentPayment(
                    student,
                    applicationId,
                    body.getYear(),
                    body.getMonth(),
                    body.getPaymentMethod(),
                    body.getReceiptUrl()
            );
            return ResponseEntity.ok(result);
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @PostMapping("/{id}/rent-months/student-payment-log/clear")
    @Transactional
    public ResponseEntity<?> studentClearRentPaymentLog(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthToggleRequest body
    ) {
        UserAccount student;
        try {
            student = requireStudent(authorization);
        } catch (IllegalArgumentException ex) {
            return unauthorizedOrForbidden(ex);
        }
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application id is required"));
        }
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        if (m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "month must be between 1 and 12"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        if (app.getStudentId() == null || !app.getStudentId().equals(student.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update your own applications."));
        }

        Optional<ApplicationRentMonthStudentLog> existing =
                rentMonthStudentLogRepository.findByApplicationIdAndRentYearAndRentMonth(applicationId, y, m);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No payment log exists for that month."));
        }
        rentMonthStudentLogRepository.delete(existing.get());

        return ResponseEntity.ok(buildRentYearStateBody(applicationId, y));
    }

    /**
     * Landlord rejects the student's self-reported payment log for a month; the student must log their payment again.
     */
    @PostMapping("/{id}/rent-months/student-payment-log/reject")
    @Transactional
    public ResponseEntity<?> landlordRejectStudentRentPaymentLog(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer applicationId,
            @RequestBody RentMonthToggleRequest body
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
        if (body == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "year and month are required"));
        }
        int y = body.getYear();
        int m = body.getMonth();
        if (y < 2000 || y > 2100) {
            return ResponseEntity.badRequest().body(Map.of("message", "year must be between 2000 and 2100"));
        }
        if (m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "month must be between 1 and 12"));
        }

        Optional<Application> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Application not found"));
        }
        Application app = appOpt.get();
        Optional<PropertyEntity> propOpt = propertyRepository.findById(app.getPropertyId());
        if (propOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Property not found"));
        }
        PropertyEntity property = propOpt.get();
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update rent tracking for your own listings"));
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "Rent calendar is only available for accepted applications."
            ));
        }

        Optional<LocalDate[]> leaseBounds = parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "This application is missing valid move-in and lease-end dates; rent months cannot be updated."
            ));
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(y, m, moveIn, moveOut)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "That month is outside the tenancy period (from move-in through lease end)."
            ));
        }

        Optional<ApplicationRentMonthStudentLog> existing =
                rentMonthStudentLogRepository.findByApplicationIdAndRentYearAndRentMonth(applicationId, y, m);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "message",
                    "There is no student payment log to reject for that month."
            ));
        }
        rentMonthStudentLogRepository.delete(existing.get());

        return ResponseEntity.ok(buildRentYearStateBody(applicationId, y));
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String t = url.trim();
        while (t.endsWith("/")) {
            t = t.substring(0, t.length() - 1);
        }
        return t;
    }

    private static boolean isAllowedReceiptUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return false;
        }
        String u = url.trim();
        if (u.length() > 1024 || u.contains("..")) {
            return false;
        }
        if (u.startsWith("/uploads/rent-receipts/")) {
            return true;
        }
        return u.startsWith("http://") || u.startsWith("https://");
    }

    private static String safeReceiptFilename(String original) {
        if (original == null) {
            return "receipt";
        }
        String base = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (base.length() > 100) {
            return base.substring(base.length() - 100);
        }
        return base.isEmpty() ? "receipt" : base;
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private static Optional<LocalDate> parseIsoDate(String raw) {
        if (!StringUtils.hasText(raw)) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDate.parse(raw.trim()));
        } catch (DateTimeParseException ex) {
            return Optional.empty();
        }
    }

    /**
     * Move-in and lease-end (last day of tenancy), both inclusive for calendar months.
     */
    private static Optional<LocalDate[]> parseLeaseBounds(Application app) {
        Optional<LocalDate> in = parseIsoDate(app.getPreferredMoveIn());
        Optional<LocalDate> out = parseIsoDate(app.getLeaseEnd());
        if (in.isEmpty() || out.isEmpty()) {
            return Optional.empty();
        }
        LocalDate a = in.get();
        LocalDate b = out.get();
        if (!b.isAfter(a)) {
            return Optional.empty();
        }
        return Optional.of(new LocalDate[] { a, b });
    }

    private static boolean yearMonthWithinLease(int year, int month, LocalDate moveIn, LocalDate moveOut) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        return !monthEnd.isBefore(moveIn) && !monthStart.isAfter(moveOut);
    }
}
