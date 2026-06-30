package com.mysewa.api.web;

/**
 * Student logs that rent for a month has been paid (awaiting landlord confirmation).
 */
public class RentPaymentLogRequest {

    private Integer bookingId;
    private Integer month;
    private Integer year;
    /** cash | bank_transfer | duitnow_qr | toyyibpay */
    private String paymentMethod;
    private String receiptUrl;

    public Integer getBookingId() {
        return bookingId;
    }

    public void setBookingId(Integer bookingId) {
        this.bookingId = bookingId;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
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
