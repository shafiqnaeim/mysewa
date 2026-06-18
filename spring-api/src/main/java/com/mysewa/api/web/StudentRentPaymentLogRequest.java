package com.mysewa.api.web;

/**
 * Student confirms a rent payment attempt for a month (tracking for landlord review).
 */
public class StudentRentPaymentLogRequest {

    private Integer year;
    private Integer month;
    /** cash | bank_transfer | duitnow_qr | toyyibpay */
    private String paymentMethod;
    /** Public path from receipt upload, e.g. /uploads/rent-receipts/... */
    private String receiptUrl;

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

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getReceiptUrl() {
        return receiptUrl;
    }

    public void setReceiptUrl(String receiptUrl) {
        this.receiptUrl = receiptUrl;
    }
}
