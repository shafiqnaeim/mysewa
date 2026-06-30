package com.mysewa.api.web;

import java.math.BigDecimal;

public class RentPaymentConfirmRequest {

    private BigDecimal amount;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
