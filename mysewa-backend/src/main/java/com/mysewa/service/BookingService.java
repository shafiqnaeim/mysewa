package com.mysewa.service;

import com.mysewa.dto.request.BookingRequest;
import com.mysewa.dto.request.BookingStatusUpdateRequest;
import com.mysewa.dto.response.BookingResponse;
import com.mysewa.enums.BookingStatus;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Booking;
import com.mysewa.model.Property;
import com.mysewa.model.User;
import com.mysewa.repository.BookingRepository;
import com.mysewa.repository.PropertyRepository;
import com.mysewa.util.SecurityUtil;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

    public BookingService(
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository,
            NotificationService notificationService
    ) {
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public BookingResponse create(BookingRequest request) {
        User student = requireStudent();
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));

        if (property.getLandlord() != null && Objects.equals(property.getLandlord().getId(), student.getId())) {
            throw new BadRequestException("You cannot apply for your own listing");
        }
        if (bookingRepository.existsByProperty_IdAndStudent_Id(property.getId(), student.getId())) {
            throw new BadRequestException("You have already applied for this listing");
        }

        LocalDateTime now = LocalDateTime.now();
        Booking booking = Booking.builder()
                .property(property)
                .student(student)
                .preferredMoveIn(request.getPreferredMoveIn())
                .leaseEnd(request.getLeaseEnd())
                .leaseDays(request.getLeaseDays())
                .leaseMonths(request.getLeaseMonths() != null ? request.getLeaseMonths() : 12)
                .status(BookingStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();
        Booking saved = bookingRepository.save(booking);

        if (property.getLandlord() != null) {
            notificationService.notify(
                    property.getLandlord().getId(),
                    "New rental application",
                    student.getFullName() + " applied for " + property.getName()
            );
        }
        return BookingResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listForStudent() {
        User student = requireStudent();
        return bookingRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .map(BookingResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listForLandlord() {
        User landlord = requireLandlord();
        List<Property> properties = propertyRepository.findByLandlord_IdOrderByUpdatedAtDesc(landlord.getId());
        List<Integer> propertyIds = properties.stream().map(Property::getId).filter(Objects::nonNull).toList();
        if (propertyIds.isEmpty()) {
            return List.of();
        }
        return bookingRepository.findByProperty_IdInOrderByCreatedAtDesc(propertyIds).stream()
                .map(BookingResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookingResponse getById(Integer id) {
        Booking booking = findBooking(id);
        assertCanView(booking);
        return BookingResponse.from(booking);
    }

    @Transactional
    public BookingResponse updateStatus(Integer id, BookingStatusUpdateRequest request) {
        User landlord = requireLandlord();
        Booking booking = findBooking(id);
        Property property = booking.getProperty();
        if (property.getLandlord() == null || !property.getLandlord().getId().equals(landlord.getId())) {
            throw new UnauthorizedException("You can only update applications for your own listings");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending applications can be updated");
        }
        if (request.getStatus() == null) {
            throw new BadRequestException("status is required");
        }
        if (request.getStatus() == BookingStatus.ACCEPTED) {
            if (request.getDepositAmount() == null) {
                throw new BadRequestException("depositAmount is required when accepting");
            }
            booking.setLandlordDepositAmount(request.getDepositAmount());
        }
        booking.setStatus(request.getStatus());
        booking.setUpdatedAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);

        if (request.getStatus() == BookingStatus.ACCEPTED) {
            notificationService.notify(saved.getStudent().getId(), "Application accepted",
                    "Your application for " + property.getName() + " was accepted.");
        } else if (request.getStatus() == BookingStatus.REJECTED) {
            notificationService.notify(saved.getStudent().getId(), "Application declined",
                    "Your application for " + property.getName() + " was not accepted.");
        }
        return BookingResponse.from(saved);
    }

    @Transactional
    public BookingResponse cancel(Integer id) {
        User student = requireStudent();
        Booking booking = findBooking(id);
        if (!booking.getStudent().getId().equals(student.getId())) {
            throw new UnauthorizedException("Access denied");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can be cancelled");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(LocalDateTime.now());
        return BookingResponse.from(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listAll() {
        return bookingRepository.findAllByOrderByCreatedAtDesc(org.springframework.data.domain.PageRequest.of(0, 500))
                .map(BookingResponse::from)
                .getContent();
    }

    private Booking findBooking(Integer id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }

    private void assertCanView(Booking booking) {
        User user = SecurityUtil.currentUser();
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (user.getRole() == Role.STUDENT && booking.getStudent().getId().equals(user.getId())) {
            return;
        }
        if (user.getRole() == Role.LANDLORD
                && booking.getProperty().getLandlord() != null
                && booking.getProperty().getLandlord().getId().equals(user.getId())) {
            return;
        }
        throw new UnauthorizedException("Access denied");
    }

    private User requireStudent() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.STUDENT) {
            throw new UnauthorizedException("Student access required");
        }
        return user;
    }

    private User requireLandlord() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.LANDLORD && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Landlord access required");
        }
        return user;
    }
}
