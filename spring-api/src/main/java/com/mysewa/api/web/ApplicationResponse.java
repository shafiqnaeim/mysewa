package com.mysewa.api.web;

import com.mysewa.api.domain.Application;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.service.IcCryptoService;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class ApplicationResponse {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Integer id;
    public Integer propertyId;
    public String propertyName;
    public String status;
    public String preferredMoveIn;
    public String createdAt;
    public String updatedAt;
    /** Requested lease length in months (1–120). */
    public Integer leaseMonths;
    /** Last day of tenancy (yyyy-MM-dd) when recorded at apply time. */
    public String leaseEnd;
    /**
     * Same as {@link #leaseEnd} — mirrors the create-request field name so clients always see move-out
     * whether they read {@code leaseEnd} or {@code leaseEndDate}.
     */
    public String leaseEndDate;
    /** Calendar-day span for the lease when recorded at apply time. */
    public Integer leaseDays;
    public ApplicationStudentSnippet student;
    /** True after a completed deposit transaction exists for this application. */
    public Boolean depositPaid;
    /** True when the landlord saved a deposit amount on acceptance (see {@link #landlordDepositAmount}). */
    public Boolean depositSetByLandlord;
    /** Deposit in MYR the landlord entered when accepting; null on older rows or before accept. */
    public BigDecimal landlordDepositAmount;
    /** Required deposit from the property listing (landlord-configured). */
    public BigDecimal depositAmount;
    /** Deposit from the property listing raw value (same source as {@link #depositAmount}). */
    public BigDecimal propertyDepositAmount;
    /** Payment status for the tenancy deposit: {@code pending} or {@code paid}. */
    public String depositStatus;
    /** Lifecycle key: pending, pending_payment, confirmed, active, completed, rejected. */
    public String displayStatus;
    /** Human label for {@link #displayStatus}. */
    public String displayStatusLabel;
    /** @deprecated Prefer {@link #depositAmount}. Legacy alias for required deposit. */
    public BigDecimal depositAmountSuggested;
    /** Optional note from the landlord when the application was approved or rejected. */
    public String landlordMessage;

    public static class ApplicationStudentSnippet {
        public Integer id;
        public String fullName;
        public String email;
        public String phoneNumber;
        public String icNumber;
        public String university;
        public String race;
        public String religion;
    }

    public static ApplicationResponse from(Application a, PropertyEntity property, UserAccount student, IcCryptoService icCrypto) {
        ApplicationResponse r = new ApplicationResponse();
        r.id = a.getId();
        r.propertyId = a.getPropertyId();
        r.propertyName = property != null ? property.getName() : null;
        r.status = a.getStatus();
        r.preferredMoveIn = a.getPreferredMoveIn();
        r.leaseMonths = a.getLeaseMonths() != null ? a.getLeaseMonths() : 12;
        r.leaseEnd = a.getLeaseEnd();
        r.leaseEndDate = a.getLeaseEnd();
        r.leaseDays = a.getLeaseDays();
        r.landlordDepositAmount = a.getLandlordDepositAmount();
        r.landlordMessage = a.getLandlordMessage();
        r.depositSetByLandlord =
                a.getLandlordDepositAmount() != null && a.getLandlordDepositAmount().compareTo(BigDecimal.ZERO) > 0;
        r.createdAt = a.getCreatedAt() != null ? ISO.format(a.getCreatedAt()) : null;
        r.updatedAt = a.getUpdatedAt() != null ? ISO.format(a.getUpdatedAt()) : null;
        r.student = new ApplicationStudentSnippet();
        if (student != null) {
            r.student.id = student.getId();
            r.student.fullName = student.getFullName();
            r.student.email = student.getEmail();
            r.student.phoneNumber = student.getPhoneNumber();
            r.student.icNumber = icCrypto != null ? icCrypto.decryptForDisplay(student.getIcNumber()) : student.getIcNumber();
            r.student.university = student.getUniversity();
            r.student.race = student.getRace();
            r.student.religion = student.getReligion();
        }
        return r;
    }
}
