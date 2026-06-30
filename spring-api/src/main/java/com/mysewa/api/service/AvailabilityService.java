package com.mysewa.api.service;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.ApplicationRentMonthRecord;
import com.mysewa.api.domain.PropertyAvailabilityDay;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.repo.ApplicationRentMonthRecordRepository;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyAvailabilityDayRepository;
import com.mysewa.api.repo.PropertyRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AvailabilityService {

    public static final String DAY_STATE_OCCUPIED = "occupied";
    public static final String MONTH_STATE_PENDING = "pending";
    public static final String MONTH_STATE_RECEIVED = "received";

    private final PropertyAvailabilityDayRepository availabilityDayRepository;
    private final ApplicationRentMonthRecordRepository rentMonthRecordRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final FinancialTransactionRepository financialTransactionRepository;

    public AvailabilityService(
            PropertyAvailabilityDayRepository availabilityDayRepository,
            ApplicationRentMonthRecordRepository rentMonthRecordRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            FinancialTransactionRepository financialTransactionRepository
    ) {
        this.availabilityDayRepository = availabilityDayRepository;
        this.rentMonthRecordRepository = rentMonthRecordRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.financialTransactionRepository = financialTransactionRepository;
    }

    @Transactional
    public void lockDatesForBooking(Application application, PropertyEntity property) {
        if (application == null || property == null || application.getId() == null) {
            return;
        }
        if (availabilityDayRepository.existsByApplicationId(application.getId())) {
            return;
        }
        Optional<LocalDate[]> bounds = parseLeaseBounds(application);
        if (bounds.isEmpty()) {
            return;
        }
        LocalDate moveIn = bounds.get()[0];
        LocalDate moveOut = bounds.get()[1];
        LocalDateTime now = LocalDateTime.now();
        List<PropertyAvailabilityDay> rows = new ArrayList<>();
        for (LocalDate day = moveIn; !day.isAfter(moveOut); day = day.plusDays(1)) {
            PropertyAvailabilityDay row = new PropertyAvailabilityDay();
            row.setPropertyId(property.getId());
            row.setAvailabilityDate(day);
            row.setApplicationId(application.getId());
            row.setDayState(DAY_STATE_OCCUPIED);
            row.setCreatedAt(now);
            rows.add(row);
        }
        availabilityDayRepository.saveAll(rows);
    }

    @Transactional
    public void createPendingRentMonths(Application application, PropertyEntity property) {
        if (application == null || property == null || application.getId() == null) {
            return;
        }
        Optional<LocalDate[]> bounds = parseLeaseBounds(application);
        if (bounds.isEmpty()) {
            return;
        }
        LocalDate moveIn = bounds.get()[0];
        LocalDate moveOut = bounds.get()[1];
        BigDecimal monthlyRent = property.getPrice() != null && property.getPrice() > 0
                ? BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();

        YearMonth cursor = YearMonth.from(moveIn);
        YearMonth last = YearMonth.from(moveOut);
        while (!cursor.isAfter(last)) {
            if (yearMonthWithinLease(cursor.getYear(), cursor.getMonthValue(), moveIn, moveOut)) {
                int y = cursor.getYear();
                int m = cursor.getMonthValue();
                Optional<ApplicationRentMonthRecord> existing =
                        rentMonthRecordRepository.findByApplicationIdAndRentYearAndRentMonth(
                                application.getId(),
                                y,
                                m
                        );
                if (existing.isEmpty()) {
                    ApplicationRentMonthRecord row = new ApplicationRentMonthRecord();
                    row.setApplicationId(application.getId());
                    row.setRentYear(y);
                    row.setRentMonth(m);
                    row.setAmount(monthlyRent);
                    row.setMonthState(MONTH_STATE_PENDING);
                    row.setRecordedAt(now);
                    rentMonthRecordRepository.save(row);
                }
            }
            cursor = cursor.plusMonths(1);
        }
    }

    @Transactional
    public void unlockDatesForBooking(Application application) {
        if (application == null || application.getId() == null) {
            return;
        }
        Integer propertyId = application.getPropertyId();
        availabilityDayRepository.deleteByApplicationId(application.getId());
        rentMonthRecordRepository.deleteByApplicationId(application.getId());
        if (propertyId != null) {
            refreshPropertyListingStatus(propertyId);
        }
    }

    /**
     * Ends a tenancy: release availability locks but keep rent month history.
     */
    @Transactional
    public void releaseTenancyAvailability(Application application) {
        if (application == null || application.getId() == null) {
            return;
        }
        Integer propertyId = application.getPropertyId();
        availabilityDayRepository.deleteByApplicationId(application.getId());
        if (propertyId != null) {
            refreshPropertyListingStatus(propertyId);
        }
    }

    @Transactional
    public void markPropertyOccupied(PropertyEntity property) {
        if (property == null || property.getId() == null) {
            return;
        }
        property.setStatus("rented");
        property.setUpdatedAt(LocalDateTime.now());
        propertyRepository.save(property);
    }

    @Transactional
    public void refreshPropertyListingStatus(Integer propertyId) {
        if (propertyId == null) {
            return;
        }
        Optional<PropertyEntity> propOpt = propertyRepository.findById(propertyId);
        if (propOpt.isEmpty()) {
            return;
        }
        PropertyEntity property = propOpt.get();
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusYears(5);
        boolean hasFutureOccupancy = resolveOccupiedDates(propertyId, today, horizon).stream()
                .anyMatch(d -> !d.isBefore(today));
        String nextStatus = hasFutureOccupancy ? "rented" : "available";
        if (!nextStatus.equalsIgnoreCase(String.valueOf(property.getStatus()))) {
            property.setStatus(nextStatus);
            property.setUpdatedAt(LocalDateTime.now());
            propertyRepository.save(property);
        }
    }

    public Map<String, Object> availabilityPayload(Integer propertyId, LocalDate from, LocalDate to) {
        Set<LocalDate> occupied = resolveOccupiedDates(propertyId, from, to);
        boolean listingUnavailable = propertyRepository.findById(propertyId)
                .map(p -> isListingUnavailable(p.getStatus()))
                .orElse(false);
        LocalDate today = LocalDate.now();
        List<Map<String, String>> days = new ArrayList<>();
        List<String> occupiedDates = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            String status = resolveDayStatus(d, today, occupied, listingUnavailable);
            Map<String, String> day = new LinkedHashMap<>();
            day.put("date", d.toString());
            day.put("status", status);
            days.add(day);
            if ("occupied".equals(status)) {
                occupiedDates.add(d.toString());
            }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("propertyId", propertyId);
        body.put("from", from.toString());
        body.put("to", to.toString());
        body.put("occupiedDates", occupiedDates);
        body.put("days", days);
        return body;
    }

    /**
     * Full tenancy rent calendar for a confirmed booking (all lease months with payment status).
     */
    public Map<String, Object> bookingCalendarPayload(Application application, PropertyEntity property) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("applicationId", application.getId());
        body.put("propertyId", application.getPropertyId());
        body.put("preferredMoveIn", application.getPreferredMoveIn());
        body.put("leaseEnd", application.getLeaseEnd());
        body.put("leaseEndDate", application.getLeaseEnd());
        if (property != null) {
            body.put("propertyName", property.getName());
            body.put("monthlyRent", property.getPrice());
        }

        Optional<LocalDate[]> bounds = parseLeaseBounds(application);
        if (bounds.isEmpty()) {
            body.put("months", List.of());
            return body;
        }
        LocalDate moveIn = bounds.get()[0];
        LocalDate moveOut = bounds.get()[1];
        BigDecimal defaultRent = property != null && property.getPrice() != null && property.getPrice() > 0
                ? BigDecimal.valueOf(property.getPrice()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<ApplicationRentMonthRecord> allRecords =
                rentMonthRecordRepository.findByApplicationIdOrderByRentYearAscRentMonthAsc(application.getId());
        Map<String, ApplicationRentMonthRecord> recordIndex = new LinkedHashMap<>();
        for (ApplicationRentMonthRecord row : allRecords) {
            recordIndex.put(row.getRentYear() + "-" + row.getRentMonth(), row);
        }

        List<Map<String, Object>> months = new ArrayList<>();
        YearMonth cursor = YearMonth.from(moveIn);
        YearMonth last = YearMonth.from(moveOut);
        while (!cursor.isAfter(last)) {
            if (yearMonthWithinLease(cursor.getYear(), cursor.getMonthValue(), moveIn, moveOut)) {
                int y = cursor.getYear();
                int m = cursor.getMonthValue();
                ApplicationRentMonthRecord rec = recordIndex.get(y + "-" + m);
                String status = MONTH_STATE_PENDING;
                BigDecimal amount = defaultRent;
                if (rec != null) {
                    amount = rec.getAmount() != null ? rec.getAmount() : defaultRent;
                    status = normalizeRentMonthState(rec.getMonthState());
                } else if (!financialTransactionRepository.hasCompletedDeposit(application.getId())) {
                    status = "outside";
                }
                Map<String, Object> one = new LinkedHashMap<>();
                one.put("year", y);
                one.put("month", m);
                one.put("status", status);
                one.put("amount", amount);
                months.add(one);
            }
            cursor = cursor.plusMonths(1);
        }
        body.put("months", months);
        return body;
    }

    private Set<LocalDate> resolveOccupiedDates(Integer propertyId, LocalDate from, LocalDate to) {
        Set<LocalDate> occupied = new LinkedHashSet<>();
        if (propertyId == null || from == null || to == null || to.isBefore(from)) {
            return occupied;
        }

        for (PropertyAvailabilityDay row :
                availabilityDayRepository.findByPropertyIdAndAvailabilityDateBetweenOrderByAvailabilityDateAsc(
                        propertyId,
                        from,
                        to
                )) {
            if (DAY_STATE_OCCUPIED.equalsIgnoreCase(row.getDayState())) {
                occupied.add(row.getAvailabilityDate());
            }
        }

        for (Application app : applicationRepository.findByPropertyIdInOrderByCreatedAtDesc(List.of(propertyId))) {
            if (!isConfirmedBooking(app)) {
                continue;
            }
            Optional<LocalDate[]> bounds = parseLeaseBounds(app);
            if (bounds.isEmpty()) {
                continue;
            }
            LocalDate moveIn = bounds.get()[0];
            LocalDate moveOut = bounds.get()[1];
            LocalDate start = moveIn.isBefore(from) ? from : moveIn;
            LocalDate end = moveOut.isAfter(to) ? to : moveOut;
            if (end.isBefore(start)) {
                continue;
            }
            for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
                occupied.add(day);
            }
        }
        return occupied;
    }

    private boolean isConfirmedBooking(Application app) {
        if (app == null || app.getId() == null) {
            return false;
        }
        String status = nullSafe(app.getStatus()).toLowerCase(Locale.ROOT);
        if ("completed".equals(status) || "cancelled".equals(status)) {
            return false;
        }
        if (!"accepted".equals(status)) {
            return false;
        }
        return financialTransactionRepository.hasCompletedDeposit(app.getId());
    }

    private static String resolveDayStatus(
            LocalDate day,
            LocalDate today,
            Set<LocalDate> occupied,
            boolean listingUnavailable
    ) {
        if (day.isBefore(today)) {
            return "past";
        }
        if (occupied.contains(day)) {
            return "occupied";
        }
        if (listingUnavailable) {
            return "unavailable";
        }
        return "available";
    }

    private static boolean isListingUnavailable(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        String s = status.trim().toLowerCase(Locale.ROOT);
        return "maintenance".equals(s) || "unavailable".equals(s);
    }

    private static String normalizeRentMonthState(String raw) {
        if (!StringUtils.hasText(raw)) {
            return MONTH_STATE_PENDING;
        }
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if ("unavailable".equals(t)) {
            return "unavailable";
        }
        if (MONTH_STATE_PENDING.equals(t) || "unpaid".equals(t)) {
            return MONTH_STATE_PENDING;
        }
        if ("received".equals(t) || "paid".equals(t) || "completed".equals(t)) {
            return "paid";
        }
        return MONTH_STATE_PENDING;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    public static Optional<LocalDate[]> parseLeaseBounds(Application app) {
        Optional<LocalDate> in = parseIsoDate(app.getPreferredMoveIn());
        Optional<LocalDate> out = parseIsoDate(app.getLeaseEnd());
        if (in.isEmpty() || out.isEmpty()) {
            return Optional.empty();
        }
        LocalDate moveIn = in.get();
        LocalDate moveOut = out.get();
        if (moveOut.isBefore(moveIn)) {
            return Optional.empty();
        }
        return Optional.of(new LocalDate[] { moveIn, moveOut });
    }

    private static Optional<LocalDate> parseIsoDate(String raw) {
        if (!StringUtils.hasText(raw)) {
            return Optional.empty();
        }
        try {
            String trimmed = raw.trim();
            if (trimmed.length() >= 10) {
                trimmed = trimmed.substring(0, 10);
            }
            return Optional.of(LocalDate.parse(trimmed));
        } catch (DateTimeParseException ex) {
            return Optional.empty();
        }
    }

    private static boolean yearMonthWithinLease(int year, int month, LocalDate moveIn, LocalDate moveOut) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        return !monthEnd.isBefore(moveIn) && !monthStart.isAfter(moveOut);
    }
}
