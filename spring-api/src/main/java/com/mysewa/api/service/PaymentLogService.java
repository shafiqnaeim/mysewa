package com.mysewa.api.service;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.ApplicationRentMonthRecord;
import com.mysewa.api.domain.ApplicationRentMonthStudentLog;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRentMonthRecordRepository;
import com.mysewa.api.repo.ApplicationRentMonthStudentLogRepository;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UserAccountRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentLogService {

    private static final String MONTH_STATE_RECEIVED = "received";
    private static final String MONTH_STATE_PENDING = "pending";
    private static final String MONTH_STATE_UNAVAILABLE = "unavailable";

    private static final BigDecimal RENT_AMOUNT_MIN = new BigDecimal("1.00");
    private static final BigDecimal RENT_AMOUNT_MAX = new BigDecimal("999999.99");

    private static final java.util.Set<String> STUDENT_RENT_PAYMENT_METHODS = java.util.Set.of(
            "cash",
            "bank_transfer",
            "duitnow_qr",
            "toyyibpay"
    );

    private final ApplicationRepository applicationRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRentMonthRecordRepository rentMonthRecordRepository;
    private final ApplicationRentMonthStudentLogRepository rentMonthStudentLogRepository;
    private final NotificationService notificationService;
    private final UserAccountRepository userAccountRepository;

    public PaymentLogService(
            ApplicationRepository applicationRepository,
            PropertyRepository propertyRepository,
            ApplicationRentMonthRecordRepository rentMonthRecordRepository,
            ApplicationRentMonthStudentLogRepository rentMonthStudentLogRepository,
            NotificationService notificationService,
            UserAccountRepository userAccountRepository
    ) {
        this.applicationRepository = applicationRepository;
        this.propertyRepository = propertyRepository;
        this.rentMonthRecordRepository = rentMonthRecordRepository;
        this.rentMonthStudentLogRepository = rentMonthStudentLogRepository;
        this.notificationService = notificationService;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional
    public Map<String, Object> logStudentRentPayment(
            UserAccount student,
            Integer bookingId,
            int year,
            int month,
            String paymentMethod,
            String receiptUrl
    ) {
        if (student == null || bookingId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingId is required");
        }
        if (year < 2000 || year > 2100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "year must be between 2000 and 2100");
        }
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must be between 1 and 12");
        }
        String pm = paymentMethod == null ? "" : paymentMethod.trim().toLowerCase(Locale.ROOT);
        if (!STUDENT_RENT_PAYMENT_METHODS.contains(pm)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "paymentMethod must be one of: cash, bank_transfer, duitnow_qr, toyyibpay"
            );
        }
        String receiptUrlRaw = trimToNull(receiptUrl);
        if ("bank_transfer".equals(pm) || "duitnow_qr".equals(pm) || "toyyibpay".equals(pm)) {
            if (!isAllowedReceiptUrl(receiptUrlRaw)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Upload a receipt image or PDF for this payment method, then confirm."
                );
            }
        } else if (receiptUrlRaw != null && !isAllowedReceiptUrl(receiptUrlRaw)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid receipt URL.");
        }

        Application app = applicationRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (app.getStudentId() == null || !app.getStudentId().equals(student.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own bookings.");
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rent calendar is only available for accepted bookings."
            );
        }

        Optional<LocalDate[]> leaseBounds = AvailabilityService.parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This booking is missing valid move-in and lease-end dates."
            );
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(year, month, moveIn, moveOut)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That month is outside the tenancy period."
            );
        }

        Optional<ApplicationRentMonthRecord> landlordRow =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(bookingId, year, month);
        if (landlordRow.isPresent()) {
            String st = normalizeMonthState(landlordRow.get().getMonthState());
            if (MONTH_STATE_UNAVAILABLE.equals(st)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "That month is marked as not expecting rent."
                );
            }
            if (MONTH_STATE_RECEIVED.equals(st)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Your landlord has already marked this month as paid."
                );
            }
        }

        Optional<ApplicationRentMonthStudentLog> existingOpt =
                rentMonthStudentLogRepository.findByApplicationIdAndRentYearAndRentMonth(bookingId, year, month);
        ApplicationRentMonthStudentLog row = existingOpt.orElseGet(ApplicationRentMonthStudentLog::new);
        if (existingOpt.isEmpty()) {
            row.setApplicationId(bookingId);
            row.setRentYear(year);
            row.setRentMonth(month);
        }
        row.setLoggedAt(LocalDateTime.now());
        row.setPaymentMethod(pm);
        row.setReceiptUrl(receiptUrlRaw);
        ApplicationRentMonthStudentLog saved = rentMonthStudentLogRepository.save(row);

        propertyRepository.findById(app.getPropertyId()).ifPresent(property -> {
            if (property.getLandlordId() != null) {
                String monthName = java.time.Month.of(month)
                        .getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                String studentName = student.getFullName() != null ? student.getFullName().trim() : "A student";
                notificationService.notifyLandlordRentPaymentLogged(
                        property.getLandlordId(),
                        studentName,
                        monthName,
                        year,
                        bookingId
                );
            }
        });

        String monthName = java.time.Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("message", "Rent for " + monthName + " " + year + " logged successfully.");
        body.put("paymentLogId", saved.getId());
        body.putAll(buildYearState(bookingId, year));
        return body;
    }

    /**
     * Landlord confirms a student rent payment log — marks the month as paid and notifies the student.
     */
    @Transactional
    public Map<String, Object> confirmRentPayment(UserAccount landlord, Integer paymentLogId, BigDecimal amountOverride) {
        if (landlord == null || paymentLogId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payment log id is required");
        }
        if (!"landlord".equalsIgnoreCase(nullSafe(landlord.getRole()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only landlords can confirm rent payments.");
        }

        ApplicationRentMonthStudentLog log = rentMonthStudentLogRepository.findById(paymentLogId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment log not found"));

        Integer bookingId = log.getApplicationId();
        int year = log.getRentYear() != null ? log.getRentYear() : 0;
        int month = log.getRentMonth() != null ? log.getRentMonth() : 0;
        if (year < 2000 || year > 2100 || month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment log has invalid year or month.");
        }

        Application app = applicationRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        PropertyEntity property = propertyRepository.findById(app.getPropertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (property.getLandlordId() == null || !property.getLandlordId().equals(landlord.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only confirm payments for your own listings.");
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rent calendar is only available for accepted bookings.");
        }

        Optional<LocalDate[]> leaseBounds = AvailabilityService.parseLeaseBounds(app);
        if (leaseBounds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This booking is missing valid move-in and lease-end dates.");
        }
        LocalDate moveIn = leaseBounds.get()[0];
        LocalDate moveOut = leaseBounds.get()[1];
        if (!yearMonthWithinLease(year, month, moveIn, moveOut)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That month is outside the tenancy period.");
        }

        Optional<ApplicationRentMonthRecord> existingPaid =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(bookingId, year, month);
        if (existingPaid.isPresent()) {
            String st = normalizeMonthState(existingPaid.get().getMonthState());
            if (MONTH_STATE_RECEIVED.equals(st)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This month is already marked as paid.");
            }
            if (MONTH_STATE_UNAVAILABLE.equals(st)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That month is marked as not expecting rent.");
            }
        }

        BigDecimal amt;
        if (amountOverride != null) {
            amt = amountOverride.setScale(2, RoundingMode.HALF_UP);
        } else if (property.getPrice() != null && property.getPrice() > 0) {
            amt = BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP);
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This listing has no monthly rent on file. Enter an amount, or set the property price on My properties."
            );
        }
        if (amt.compareTo(RENT_AMOUNT_MIN) < 0 || amt.compareTo(RENT_AMOUNT_MAX) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be between RM 1.00 and RM 999,999.99");
        }

        String channel = mapStudentMethodToChannel(log.getPaymentMethod());

        ApplicationRentMonthRecord row = existingPaid.orElseGet(ApplicationRentMonthRecord::new);
        if (existingPaid.isEmpty()) {
            row.setApplicationId(bookingId);
            row.setRentYear(year);
            row.setRentMonth(month);
        }
        row.setAmount(amt);
        row.setPaymentChannel(channel);
        row.setMonthState(MONTH_STATE_RECEIVED);
        row.setRecordedAt(LocalDateTime.now());
        rentMonthRecordRepository.save(row);

        if (app.getStudentId() != null) {
            String monthName = java.time.Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            notificationService.notifyStudentRentPaymentConfirmed(app.getStudentId(), monthName, year, bookingId);
        }

        String monthName = java.time.Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        String landlordName = landlord.getFullName() != null ? landlord.getFullName().trim() : "Landlord";
        String studentName = "Student";
        if (app.getStudentId() != null) {
            studentName = userAccountRepository.findById(app.getStudentId())
                    .map(u -> u.getFullName() != null ? u.getFullName().trim() : "Student")
                    .orElse("Student");
        }
        String propertyName = property.getName() != null ? property.getName().trim() : "Property";
        String propertyAddress = buildPropertyAddress(property);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("status", "PAID");
        body.put("message", monthName + " " + year + " marked as paid.");
        body.put("paymentLogId", paymentLogId);
        body.put("receiptNumber", formatReceiptNumber(year, paymentLogId));
        body.put("studentName", studentName);
        body.put("landlordName", landlordName);
        body.put("propertyName", propertyName);
        body.put("propertyAddress", propertyAddress);
        body.put("monthLabel", monthName + " " + year);
        body.put("amount", amt);
        body.put("paymentMethod", log.getPaymentMethod());
        body.putAll(buildYearState(bookingId, year));
        return body;
    }

    private static String mapStudentMethodToChannel(String paymentMethod) {
        String pm = paymentMethod == null ? "" : paymentMethod.trim().toLowerCase(Locale.ROOT);
        return switch (pm) {
            case "cash" -> "cash";
            case "bank_transfer" -> "bank_transfer";
            case "duitnow_qr" -> "duitnow_qr";
            case "toyyibpay" -> "toyyibpay_link";
            default -> "rent_auto";
        };
    }

    private static String formatReceiptNumber(int year, int paymentLogId) {
        return String.format(Locale.ROOT, "RCP-%d-%04d", year, paymentLogId);
    }

    private static String buildPropertyAddress(PropertyEntity property) {
        if (property == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(property.getLocation())) {
            sb.append(property.getLocation().trim());
        }
        if (StringUtils.hasText(property.getCity())) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(property.getCity().trim());
        }
        return sb.toString();
    }

    public List<Map<String, Object>> listPaymentLogs(UserAccount user, Integer bookingId) {
        if (bookingId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingId is required");
        }
        Application app = applicationRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        PropertyEntity property = propertyRepository.findById(app.getPropertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));

        String role = user.getRole() == null ? "" : user.getRole().trim().toLowerCase(Locale.ROOT);
        boolean landlordOk = "landlord".equals(role)
                && property.getLandlordId() != null
                && property.getLandlordId().equals(user.getId());
        boolean studentOk = "student".equals(role)
                && app.getStudentId() != null
                && app.getStudentId().equals(user.getId());
        if (!landlordOk && !studentOk) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view payment logs for this booking.");
        }

        String studentName = "Student";
        if (app.getStudentId() != null) {
            studentName = userAccountRepository.findById(app.getStudentId())
                    .map(u -> u.getFullName() != null ? u.getFullName().trim() : "Student")
                    .orElse("Student");
        }

        List<Map<String, Object>> items = new ArrayList<>();
        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        for (ApplicationRentMonthStudentLog log :
                rentMonthStudentLogRepository.findByApplicationIdOrderByRentYearAscRentMonthAsc(bookingId)) {
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("paymentLogId", log.getId());
            one.put("month", log.getRentMonth());
            one.put("year", log.getRentYear());
            one.put("paymentMethod", log.getPaymentMethod());
            one.put("receiptUrl", log.getReceiptUrl());
            one.put("loggedAt", log.getLoggedAt() != null ? iso.format(log.getLoggedAt()) : null);
            one.put("studentName", studentName);

            String status = "pending_confirmation";
            Optional<ApplicationRentMonthRecord> rec =
                    rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(
                            bookingId,
                            log.getRentYear(),
                            log.getRentMonth()
                    );
            if (rec.isPresent()) {
                String st = normalizeMonthState(rec.get().getMonthState());
                if (MONTH_STATE_RECEIVED.equals(st)) {
                    status = "paid";
                } else if (MONTH_STATE_UNAVAILABLE.equals(st)) {
                    status = "unavailable";
                }
                one.put("amount", rec.get().getAmount());
            } else if (property.getPrice() != null) {
                one.put("amount", property.getPrice());
            }
            one.put("status", status);
            items.add(one);
        }
        return items;
    }

    /**
     * Receipt payload for a confirmed monthly rent payment (student log id).
     */
    public Map<String, Object> getRentPaymentReceipt(UserAccount user, Integer paymentLogId) {
        if (paymentLogId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payment log id is required");
        }

        ApplicationRentMonthStudentLog log = rentMonthStudentLogRepository.findById(paymentLogId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment log not found"));

        Integer bookingId = log.getApplicationId();
        int year = log.getRentYear() != null ? log.getRentYear() : 0;
        int month = log.getRentMonth() != null ? log.getRentMonth() : 0;

        Application app = applicationRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        PropertyEntity property = propertyRepository.findById(app.getPropertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));

        assertRentPaymentAccess(user, app, property);

        Optional<ApplicationRentMonthRecord> recOpt =
                rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(bookingId, year, month);
        if (recOpt.isEmpty() || !MONTH_STATE_RECEIVED.equals(normalizeMonthState(recOpt.get().getMonthState()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Receipt is only available after the landlord has confirmed this month as paid."
            );
        }
        ApplicationRentMonthRecord rec = recOpt.get();

        String studentName = "Student";
        if (app.getStudentId() != null) {
            studentName = userAccountRepository.findById(app.getStudentId())
                    .map(u -> u.getFullName() != null ? u.getFullName().trim() : "Student")
                    .orElse("Student");
        }

        String landlordName = "Landlord";
        if (property.getLandlordId() != null) {
            landlordName = userAccountRepository.findById(property.getLandlordId())
                    .map(u -> u.getFullName() != null ? u.getFullName().trim() : "Landlord")
                    .orElse("Landlord");
        }

        String monthName = month >= 1 && month <= 12
                ? java.time.Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                : String.valueOf(month);
        String propertyName = property.getName() != null ? property.getName().trim() : "Property";
        String propertyAddress = buildPropertyAddress(property);

        BigDecimal amt = rec.getAmount();
        if (amt == null && property.getPrice() != null) {
            amt = BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP);
        }

        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        String confirmedAt = rec.getRecordedAt() != null ? iso.format(rec.getRecordedAt()) : null;
        String paymentDate = confirmedAt != null ? confirmedAt
                : (log.getLoggedAt() != null ? iso.format(log.getLoggedAt()) : iso.format(LocalDateTime.now()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("paymentLogId", paymentLogId);
        body.put("bookingId", bookingId);
        body.put("year", year);
        body.put("month", month);
        body.put("receiptNumber", formatReceiptNumber(year, paymentLogId));
        body.put("paymentDate", paymentDate);
        body.put("confirmedAt", confirmedAt);
        body.put("studentName", studentName);
        body.put("propertyName", propertyName);
        body.put("propertyAddress", propertyAddress);
        body.put("monthLabel", monthName + " " + year);
        body.put("amount", amt);
        body.put("paymentMethod", log.getPaymentMethod());
        body.put("landlordName", landlordName);
        body.put("status", "PAID");
        return body;
    }

    private void assertRentPaymentAccess(UserAccount user, Application app, PropertyEntity property) {
        String role = user.getRole() == null ? "" : user.getRole().trim().toLowerCase(Locale.ROOT);
        boolean landlordOk = "landlord".equals(role)
                && property.getLandlordId() != null
                && property.getLandlordId().equals(user.getId());
        boolean studentOk = "student".equals(role)
                && app.getStudentId() != null
                && app.getStudentId().equals(user.getId());
        if (!landlordOk && !studentOk) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view this receipt.");
        }
    }

    public Map<String, Object> buildYearState(Integer applicationId, int year) {
        List<ApplicationRentMonthRecord> rows =
                rentMonthRecordRepository.findByApplicationIdAndRentYearOrderByRentMonthAsc(applicationId, year);
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
        out.put("year", year);
        out.put("paidMonths", paidMonths);
        out.put("pendingMonths", pendingMonths);
        out.put("unavailableMonths", unavailableMonths);
        out.put("rentMonthRecords", rentMonthRecords);
        List<Integer> studentLoggedMonths = new ArrayList<>();
        List<Map<String, Object>> studentRentPaymentLogs = new ArrayList<>();
        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        for (ApplicationRentMonthStudentLog lg :
                rentMonthStudentLogRepository.findByApplicationIdAndRentYearOrderByRentMonthAsc(applicationId, year)) {
            studentLoggedMonths.add(lg.getRentMonth());
            Map<String, Object> slog = new LinkedHashMap<>();
            slog.put("month", lg.getRentMonth());
            slog.put("paymentMethod", lg.getPaymentMethod());
            slog.put("receiptUrl", lg.getReceiptUrl());
            slog.put("loggedAt", lg.getLoggedAt() != null ? iso.format(lg.getLoggedAt()) : null);
            slog.put("paymentLogId", lg.getId());
            studentRentPaymentLogs.add(slog);
        }
        out.put("studentPaymentLoggedMonths", studentLoggedMonths);
        out.put("studentRentPaymentLogs", studentRentPaymentLogs);
        return out;
    }

    private static boolean yearMonthWithinLease(int year, int month, LocalDate moveIn, LocalDate moveOut) {
        java.time.YearMonth ym = java.time.YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        return !monthEnd.isBefore(moveIn) && !monthStart.isAfter(moveOut);
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

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
