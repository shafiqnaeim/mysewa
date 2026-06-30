package com.mysewa.api.web;



import com.mysewa.api.domain.Application;

import com.mysewa.api.domain.PropertyEntity;

import com.mysewa.api.domain.UserAccount;

import com.mysewa.api.repo.ApplicationRepository;

import com.mysewa.api.repo.FinancialTransactionRepository;

import com.mysewa.api.repo.PropertyRepository;

import com.mysewa.api.repo.UserAccountRepository;

import com.mysewa.api.service.AuthService;

import com.mysewa.api.service.AvailabilityService;

import com.mysewa.api.service.BookingService;

import com.mysewa.api.service.NotificationService;

import com.mysewa.api.service.IcCryptoService;

import java.util.LinkedHashMap;

import java.util.Locale;

import java.util.Map;

import java.util.Optional;

import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CrossOrigin;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.web.bind.annotation.RequestHeader;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;



/**

 * Booking alias routes (applications are bookings in MySewa).

 */

@RestController

@RequestMapping({"/api/v1/bookings", "/api/bookings"})

@CrossOrigin

public class BookingController {



    private final AuthService authService;

    private final ApplicationRepository applicationRepository;

    private final PropertyRepository propertyRepository;

    private final AvailabilityService availabilityService;

    private final BookingService bookingService;

    private final FinancialTransactionRepository financialTransactionRepository;

    private final UserAccountRepository userAccountRepository;

    private final NotificationService notificationService;

    private final IcCryptoService icCryptoService;



    public BookingController(

            AuthService authService,

            ApplicationRepository applicationRepository,

            PropertyRepository propertyRepository,

            AvailabilityService availabilityService,

            BookingService bookingService,

            FinancialTransactionRepository financialTransactionRepository,

            UserAccountRepository userAccountRepository,

            NotificationService notificationService,

            IcCryptoService icCryptoService

    ) {

        this.authService = authService;

        this.applicationRepository = applicationRepository;

        this.propertyRepository = propertyRepository;

        this.availabilityService = availabilityService;

        this.bookingService = bookingService;

        this.financialTransactionRepository = financialTransactionRepository;

        this.userAccountRepository = userAccountRepository;

        this.notificationService = notificationService;

        this.icCryptoService = icCryptoService;

    }



    @GetMapping("/{id}/calendar")

    public ResponseEntity<?> bookingCalendar(

            @RequestHeader(value = "Authorization", required = false) String authorization,

            @PathVariable("id") Integer bookingId

    ) {

        UserAccount user;

        try {

            user = authService.me(authorization);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));

        }

        if (bookingId == null) {

            return ResponseEntity.badRequest().body(Map.of("message", "Booking id is required"));

        }

        Optional<Application> appOpt = applicationRepository.findById(bookingId);

        if (appOpt.isEmpty()) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));

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

                    "You can only view this calendar as the landlord for this listing or the student on this booking."

            ));

        }

        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(

                    "message",

                    "Booking calendar is only available for accepted bookings."

            ));

        }

        return ResponseEntity.ok(availabilityService.bookingCalendarPayload(app, property));

    }



    @PutMapping("/{id}/end-tenancy")

    public ResponseEntity<?> endTenancy(

            @RequestHeader(value = "Authorization", required = false) String authorization,

            @PathVariable("id") Integer bookingId

    ) {

        UserAccount landlord;

        try {

            landlord = authService.me(authorization);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));

        }

        if (!"landlord".equals(normalizedRole(landlord))) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Landlord access required"));

        }

        if (bookingId == null) {

            return ResponseEntity.badRequest().body(Map.of("message", "Booking id is required"));

        }

        try {

            Application app = bookingService.endTenancy(landlord, bookingId);

            PropertyEntity property = propertyRepository.findById(app.getPropertyId()).orElse(null);

            UserAccount student = userAccountRepository.findById(app.getStudentId()).orElse(null);

            boolean depositPaid = financialTransactionRepository.hasCompletedDeposit(app.getId());

            ApplicationResponse booking = ApplicationResponse.from(app, property, student, icCryptoService);

            ApplicationDepositEnricher.apply(booking, app, property, depositPaid);



            notificationService.notifyStudentTenancyEnded(app.getStudentId(), app.getId());



            Map<String, Object> body = new LinkedHashMap<>();

            body.put("success", true);

            body.put("message", "Tenancy ended successfully.");

            body.put("booking", booking);

            return ResponseEntity.ok(body);

        } catch (IllegalStateException ex) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));

        } catch (IllegalArgumentException ex) {

            String msg = ex.getMessage() != null ? ex.getMessage() : "Unable to end tenancy";

            HttpStatus status = "Booking not found".equals(msg) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

            return ResponseEntity.status(status).body(Map.of("message", msg));

        }

    }



    private static String nullSafe(String value) {

        return value == null ? "" : value.trim();

    }



    private static String normalizedRole(UserAccount user) {

        if (user == null || user.getRole() == null) {

            return "";

        }

        return user.getRole().trim().toLowerCase(Locale.ROOT);

    }

}

