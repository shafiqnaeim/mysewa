package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

/** Landlord updates rental application workflow status (accept or reject only; decision is final). */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApplicationStatusUpdateRequest {

    private String status;

    /** Required when {@code status} is accepted — deposit in MYR (prototype bounds RM 100–5000). */
    private BigDecimal depositAmount;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getDepositAmount() {
        return depositAmount;
    }

    public void setDepositAmount(BigDecimal depositAmount) {
        this.depositAmount = depositAmount;
    }
}
