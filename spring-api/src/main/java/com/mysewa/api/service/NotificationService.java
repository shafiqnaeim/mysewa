package com.mysewa.api.service;

import com.mysewa.api.domain.Notification;
import com.mysewa.api.repo.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification notifyUser(Integer userId, String title, String message) {
        if (userId == null || title == null || title.isBlank()) {
            return null;
        }
        Notification row = new Notification();
        row.setUserId(userId);
        row.setTitle(title.trim());
        row.setMessage(message != null ? message.trim() : null);
        row.setRead(false);
        row.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(row);
    }

    /**
     * Notifies landlord that a student logged rent payment and should confirm in the rent tracker.
     */
    public Notification notifyLandlordRentPaymentLogged(
            Integer landlordId,
            String studentName,
            String monthName,
            int year,
            int bookingId
    ) {
        if (landlordId == null) {
            return null;
        }
        String who = studentName != null && !studentName.isBlank() ? studentName.trim() : "A student";
        String link = "/dashboard/landlord/rent-tracker/" + bookingId;
        String message = who + " has marked rent for " + monthName + " " + year
                + " as paid. Please confirm.\nOpen: " + link;
        return notifyUser(landlordId, "Rent payment to confirm", message);
    }

    /**
     * Notifies student that the landlord confirmed their rent payment.
     */
    public Notification notifyStudentRentPaymentConfirmed(
            Integer studentId,
            String monthName,
            int year,
            int bookingId
    ) {
        if (studentId == null) {
            return null;
        }
        String link = "/dashboard/student/property";
        String message = "Your rent for " + monthName + " " + year
                + " has been confirmed!\nOpen: " + link;
        return notifyUser(studentId, "Rent payment confirmed", message);
    }

    /**
     * Notifies student that the landlord ended their tenancy.
     */
    public Notification notifyStudentTenancyEnded(Integer studentId, int bookingId) {
        if (studentId == null) {
            return null;
        }
        String link = "/dashboard/student/bookings";
        String message = "Your tenancy has been ended by the landlord.\nOpen: " + link;
        return notifyUser(studentId, "Tenancy ended", message);
    }

    public Notification notifyStudentMaintenanceSubmitted(Integer studentId) {
        if (studentId == null) {
            return null;
        }
        String link = "/dashboard/student/reports";
        String message = "Your report has been submitted.\nOpen: " + link;
        return notifyUser(studentId, "Maintenance report submitted", message);
    }

    public Notification notifyStudentMaintenanceAcknowledged(Integer studentId) {
        if (studentId == null) {
            return null;
        }
        String link = "/dashboard/student/reports";
        String message = "Landlord has acknowledged your report.\nOpen: " + link;
        return notifyUser(studentId, "Report acknowledged", message);
    }

    public Notification notifyStudentMaintenanceResolved(Integer studentId) {
        if (studentId == null) {
            return null;
        }
        String link = "/dashboard/student/reports";
        String message = "Your issue has been marked as resolved.\nOpen: " + link;
        return notifyUser(studentId, "Report resolved", message);
    }

    public Notification notifyLandlordNewMaintenanceReport(
            Integer landlordId,
            String studentName,
            String propertyName
    ) {
        if (landlordId == null) {
            return null;
        }
        String who = studentName != null && !studentName.isBlank() ? studentName.trim() : "A student";
        String prop = propertyName != null && !propertyName.isBlank() ? propertyName.trim() : "your property";
        String link = "/dashboard/landlord/maintenance";
        String message = "New maintenance report from " + who + " at " + prop + ".\nOpen: " + link;
        return notifyUser(landlordId, "New maintenance report", message);
    }

    public Notification notifyIdentityVerificationSubmitted(Integer userId, String role) {
        if (userId == null) {
            return null;
        }
        String link = verificationPageForRole(role);
        String message = "Your verification documents have been submitted for review.\nOpen: " + link;
        return notifyUser(userId, "Verification submitted", message);
    }

    public Notification notifyIdentityVerificationApproved(Integer userId, String role) {
        if (userId == null) {
            return null;
        }
        String link = verificationPageForRole(role);
        String message = "✅ Your account has been verified!\nOpen: " + link;
        return notifyUser(userId, "Account verified", message);
    }

    public Notification notifyIdentityVerificationRejected(Integer userId, String role, String reason) {
        if (userId == null) {
            return null;
        }
        String link = verificationPageForRole(role);
        String why = reason != null && !reason.isBlank() ? reason.trim() : "No reason provided";
        String message = "❌ Your verification was rejected. Reason: " + why + "\nOpen: " + link;
        return notifyUser(userId, "Verification rejected", message);
    }

    private static String verificationPageForRole(String role) {
        if (role != null && "landlord".equalsIgnoreCase(role.trim())) {
            return "/dashboard/landlord/verification";
        }
        return "/dashboard/student/verification";
    }
}
