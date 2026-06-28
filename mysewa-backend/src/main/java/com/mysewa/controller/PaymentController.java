package com.mysewa.controller;

import com.mysewa.dto.request.PaymentRequest;
import com.mysewa.dto.request.PaymentStatusUpdateRequest;
import com.mysewa.dto.response.PaymentResponse;
import com.mysewa.service.PaymentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, PaymentResponse>> create(@Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", paymentService.create(request)));
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAnyRole('STUDENT','LANDLORD','ADMIN')")
    public ResponseEntity<Map<String, List<PaymentResponse>>> listByBooking(@PathVariable Integer bookingId) {
        return ResponseEntity.ok(Map.of("items", paymentService.listByBooking(bookingId)));
    }

    @GetMapping("/user")
    @PreAuthorize("hasAnyRole('STUDENT','LANDLORD','ADMIN')")
    public ResponseEntity<Map<String, List<PaymentResponse>>> listForUser() {
        return ResponseEntity.ok(Map.of("items", paymentService.listForCurrentUser()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','LANDLORD','ADMIN')")
    public ResponseEntity<Map<String, PaymentResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", paymentService.getById(id)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, PaymentResponse>> updateStatus(
            @PathVariable Integer id,
            @RequestBody PaymentStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(Map.of("item", paymentService.updateStatus(id, request)));
    }
}
