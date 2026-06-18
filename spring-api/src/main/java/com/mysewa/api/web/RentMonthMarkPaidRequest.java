package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RentMonthMarkPaidRequest {

    private Integer year;
    private Integer month;
    /** When omitted, the listing monthly {@code price} is used (must be set on the property). */
    private BigDecimal amount;
    /** Optional; defaults to {@code rent_auto} (standard listing / app payment context). */
    private String channel;

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }
}
