package com.mysewa.controller;

import com.mysewa.dto.request.BookingRequest;
import com.mysewa.dto.request.BookingStatusUpdateRequest;
import com.mysewa.dto.response.BookingResponse;
import com.mysewa.service.BookingService;
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
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, BookingResponse>> create(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("item", bookingService.create(request)));
    }

    @GetMapping("/student")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, List<BookingResponse>>> listForStudent() {
        return ResponseEntity.ok(Map.of("items", bookingService.listForStudent()));
    }

    @GetMapping("/landlord")
    @PreAuthorize("hasRole('LANDLORD')")
    public ResponseEntity<Map<String, List<BookingResponse>>> listForLandlord() {
        return ResponseEntity.ok(Map.of("items", bookingService.listForLandlord()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','LANDLORD','ADMIN')")
    public ResponseEntity<Map<String, BookingResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", bookingService.getById(id)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('LANDLORD')")
    public ResponseEntity<Map<String, BookingResponse>> updateStatus(
            @PathVariable Integer id,
            @RequestBody BookingStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(Map.of("item", bookingService.updateStatus(id, request)));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, BookingResponse>> cancel(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("item", bookingService.cancel(id)));
    }
}
