package com.mysewa.service;

import com.mysewa.dto.request.PaymentRequest;
import com.mysewa.dto.request.PaymentStatusUpdateRequest;
import com.mysewa.dto.response.PaymentResponse;
import com.mysewa.enums.PaymentStatus;
import com.mysewa.enums.PaymentType;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Booking;
import com.mysewa.model.Payment;
import com.mysewa.model.User;
import com.mysewa.repository.BookingRepository;
import com.mysewa.repository.PaymentRepository;
import com.mysewa.util.SecurityUtil;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;

    public PaymentService(PaymentRepository paymentRepository, BookingRepository bookingRepository) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        User student = requireStudent();
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (!booking.getStudent().getId().equals(student.getId())) {
            throw new UnauthorizedException("Access denied");
        }

        PaymentType type = request.getType() != null ? request.getType() : PaymentType.DEPOSIT;
        Payment payment = Payment.builder()
                .application(booking)
                .student(student)
                .property(booking.getProperty())
                .amount(request.getAmount())
                .currency("MYR")
                .type(type)
                .status(PaymentStatus.COMPLETED)
                .externalRef(request.getExternalRef())
                .createdAt(LocalDateTime.now())
                .build();
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listByBooking(Integer bookingId) {
        return paymentRepository.findByApplication_IdOrderByCreatedAtDesc(bookingId).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listForCurrentUser() {
        User user = SecurityUtil.currentUser();
        return paymentRepository.findByStudent_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentResponse getById(Integer id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse updateStatus(Integer id, PaymentStatusUpdateRequest request) {
        requireAdmin();
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (request.getStatus() == null) {
            throw new BadRequestException("status is required");
        }
        payment.setStatus(request.getStatus());
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listAll() {
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    private User requireStudent() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.STUDENT) {
            throw new UnauthorizedException("Student access required");
        }
        return user;
    }

    private User requireAdmin() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Admin access required");
        }
        return user;
    }
}
