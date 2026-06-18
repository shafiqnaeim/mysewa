package com.mysewa.api.web;

/** Admin sets {@code users.account_status} (sign-in checks non-active as suspended). */
public class AdminAccountStatusRequest {

    /** {@code active} or {@code suspended} (case-insensitive). */
    public String accountStatus;
}
