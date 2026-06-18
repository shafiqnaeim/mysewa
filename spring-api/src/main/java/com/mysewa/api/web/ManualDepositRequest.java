package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code POST /api/v1/applications/{id}/deposit/manual} — student confirms offline payment path.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ManualDepositRequest {

    /** One of: {@code bank_transfer}, {@code duitnow_qr}, {@code cash} */
    private String channel;

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }
}
