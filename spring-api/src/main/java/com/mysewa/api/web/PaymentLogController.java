package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.PaymentLogService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/rent-payments", "/api/rent-payments"})
@CrossOrigin
public class PaymentLogController {

    private final AuthService authService;
    private final PaymentLogService paymentLogService;

    public PaymentLogController(AuthService authService, PaymentLogService paymentLogService) {
        this.authService = authService;
        this.paymentLogService = paymentLogService;
    }

    @PostMapping("/log")
    public ResponseEntity<?> logPayment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody RentPaymentLogRequest body
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
        if (!"student".equalsIgnoreCase(nullSafe(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only students can log rent payments."));
        }
        if (body == null || body.getBookingId() == null || body.getYear() == null || body.getMonth() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId, year, and month are required"));
        }
        try {
            Map<String, Object> result = paymentLogService.logStudentRentPayment(
                    user,
                    body.getBookingId(),
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

    @PutMapping("/{id}/confirm")
    public ResponseEntity<?> confirmPayment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer paymentLogId,
            @RequestBody(required = false) RentPaymentConfirmRequest body
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
        if (!"landlord".equalsIgnoreCase(nullSafe(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only landlords can confirm rent payments."));
        }
        try {
            Map<String, Object> result = paymentLogService.confirmRentPayment(
                    user,
                    paymentLogId,
                    body != null ? body.getAmount() : null
            );
            return ResponseEntity.ok(result);
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<?> getReceipt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer paymentLogId
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
        try {
            Map<String, Object> result = paymentLogService.getRentPaymentReceipt(user, paymentLogId);
            return ResponseEntity.ok(result);
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> listForBooking(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("bookingId") Integer bookingId
    ) {
        UserAccount user;
        try {
            user = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
        try {
            List<Map<String, Object>> items = paymentLogService.listPaymentLogs(user, bookingId);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("bookingId", bookingId);
            body.put("items", items);
            return ResponseEntity.ok(body);
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
