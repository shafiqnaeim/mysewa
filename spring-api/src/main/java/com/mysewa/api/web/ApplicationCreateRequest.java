package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Student rental application body. Uses accessors so Jackson binds reliably for all clients.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApplicationCreateRequest {

    private Integer propertyId;
    /** ISO date (yyyy-MM-dd) — move-in */
    private String preferredMoveIn;
    /**
     * Last day of tenancy, ISO yyyy-MM-dd (must be after preferredMoveIn). Persisted as {@code lease_end}.
     * Aliases match alternate client field names.
     */
    private String leaseEndDate;
    /** Requested tenancy length in months (1–120), derived from move-in / lease-end on the client. */
    private Integer leaseMonths;

    public Integer getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(Integer propertyId) {
        this.propertyId = propertyId;
    }

    public String getPreferredMoveIn() {
        return preferredMoveIn;
    }

    public void setPreferredMoveIn(String preferredMoveIn) {
        this.preferredMoveIn = preferredMoveIn;
    }

    @JsonProperty("leaseEndDate")
    @JsonAlias({ "leaseEnd", "moveOutDate", "lease_end" })
    public String getLeaseEndDate() {
        return leaseEndDate;
    }

    public void setLeaseEndDate(String leaseEndDate) {
        this.leaseEndDate = leaseEndDate;
    }

    public Integer getLeaseMonths() {
        return leaseMonths;
    }

    public void setLeaseMonths(Integer leaseMonths) {
        this.leaseMonths = leaseMonths;
    }
}
