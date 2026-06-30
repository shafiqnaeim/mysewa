package com.mysewa.api.service;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.FinancialTransactionRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.web.ApplicationDisplayStatus;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Confirmed booking side-effects: availability calendar lock + rent month scaffolding.
 */
@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private static final Set<String> ENDABLE_DISPLAY_KEYS = Set.of("confirmed", "active", "completed");

    private final AvailabilityService availabilityService;
    private final ApplicationRepository applicationRepository;
    private final PropertyRepository propertyRepository;
    private final FinancialTransactionRepository financialTransactionRepository;

    public BookingService(
            AvailabilityService availabilityService,
            ApplicationRepository applicationRepository,
            PropertyRepository propertyRepository,
            FinancialTransactionRepository financialTransactionRepository
    ) {
        this.availabilityService = availabilityService;
        this.applicationRepository = applicationRepository;
        this.propertyRepository = propertyRepository;
        this.financialTransactionRepository = financialTransactionRepository;
    }

    /**
     * Called when deposit payment completes (PENDING_PAYMENT → CONFIRMED).
     */
    @Transactional
    public void onDepositConfirmed(Application application, PropertyEntity property) {
        if (application == null || property == null) {
            return;
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(application.getStatus()))) {
            return;
        }
        try {
            availabilityService.lockDatesForBooking(application, property);
            availabilityService.createPendingRentMonths(application, property);
            availabilityService.markPropertyOccupied(property);
            log.info(
                    "Booking {} confirmed: locked availability for property {} ({} – {})",
                    application.getId(),
                    property.getId(),
                    application.getPreferredMoveIn(),
                    application.getLeaseEnd()
            );
        } catch (Exception ex) {
            log.error("Failed to update availability for application {}: {}", application.getId(), ex.getMessage());
            throw ex;
        }
    }

    /**
     * Called when a booking is cancelled — release locked dates and remove pending rent rows.
     */
    @Transactional
    public void onBookingCancelled(Application application) {
        if (application == null) {
            return;
        }
        availabilityService.unlockDatesForBooking(application);
        log.info("Booking {} cancelled: availability unlocked for property {}", application.getId(), application.getPropertyId());
    }

    /**
     * Landlord ends an active tenancy: marks booking completed and releases the listing.
     */
    @Transactional
    public Application endTenancy(UserAccount landlord, Integer bookingId) {
        if (landlord == null || landlord.getId() == null) {
            throw new IllegalArgumentException("Authentication required");
        }
        if (bookingId == null) {
            throw new IllegalArgumentException("Booking id is required");
        }
        Application app = applicationRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if ("completed".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            throw new IllegalArgumentException("Tenancy has already ended");
        }
        PropertyEntity property = propertyRepository.findById(app.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found"));
        if (property.getLandlordId() == null || !Objects.equals(property.getLandlordId(), landlord.getId())) {
            throw new IllegalStateException("You can only end tenancies for your own listings");
        }
        if (!"accepted".equalsIgnoreCase(nullSafe(app.getStatus()))) {
            throw new IllegalArgumentException("Only confirmed bookings can be ended");
        }
        boolean depositPaid = financialTransactionRepository.hasCompletedDeposit(app.getId());
        if (!depositPaid) {
            throw new IllegalArgumentException("Deposit must be confirmed before ending the tenancy");
        }
        String displayKey = ApplicationDisplayStatus.resolveKey(app, true);
        if (!ENDABLE_DISPLAY_KEYS.contains(displayKey)) {
            throw new IllegalArgumentException("This booking cannot be ended yet");
        }

        app.setStatus("completed");
        app.setUpdatedAt(LocalDateTime.now());
        applicationRepository.save(app);
        availabilityService.releaseTenancyAvailability(app);

        log.info(
                "Booking {} ended by landlord {}: property {} marked available",
                app.getId(),
                landlord.getId(),
                property.getId()
        );
        return app;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
