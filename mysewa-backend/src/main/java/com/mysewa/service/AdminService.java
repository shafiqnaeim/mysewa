package com.mysewa.service;

import com.mysewa.dto.request.UserStatusUpdateRequest;
import com.mysewa.dto.response.BookingResponse;
import com.mysewa.dto.response.PaymentResponse;
import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.dto.response.UserResponse;
import com.mysewa.enums.BookingStatus;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.model.Property;
import com.mysewa.model.User;
import com.mysewa.repository.BookingRepository;
import com.mysewa.repository.PaymentRepository;
import com.mysewa.repository.PropertyRepository;
import com.mysewa.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final PaymentService paymentService;

    public AdminService(
            UserRepository userRepository,
            PropertyRepository propertyRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            BookingService bookingService,
            PaymentService paymentService
    ) {
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.bookingService = bookingService;
        this.paymentService = paymentService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> statistics() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("usersTotal", userRepository.count());
        stats.put("usersStudents", userRepository.countByRole(Role.STUDENT));
        stats.put("usersLandlords", userRepository.countByRole(Role.LANDLORD));
        stats.put("propertiesTotal", propertyRepository.count());
        stats.put("bookingsPending", bookingRepository.countByStatus(BookingStatus.PENDING));
        stats.put("bookingsAccepted", bookingRepository.countByStatus(BookingStatus.ACCEPTED));
        stats.put("paymentsTotal", paymentRepository.count());
        return stats;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.findAll(pr).map(UserResponse::from);
    }

    @Transactional
    public UserResponse verifyUser(Integer id) {
        User user = findUser(id);
        user.setDocumentVerificationStatus("verified");
        user.setUpdatedAt(LocalDateTime.now());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUserStatus(Integer id, UserStatusUpdateRequest request) {
        if (request.getAccountStatus() == null || request.getAccountStatus().isBlank()) {
            throw new BadRequestException("accountStatus is required");
        }
        User user = findUser(id);
        user.setAccountStatus(request.getAccountStatus().trim());
        user.setUpdatedAt(LocalDateTime.now());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> listPendingProperties() {
        return propertyRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(
                "pending",
                PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).map(PropertyResponse::from).getContent();
    }

    @Transactional
    public PropertyResponse verifyProperty(Integer id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));
        property.setStatus("available");
        property.setUpdatedAt(LocalDateTime.now());
        return PropertyResponse.from(propertyRepository.save(property));
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listBookings() {
        return bookingService.listAll();
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listPayments() {
        return paymentService.listAll();
    }

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
