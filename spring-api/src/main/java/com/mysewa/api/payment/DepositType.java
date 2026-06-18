package com.mysewa.api.payment;

import java.util.Arrays;
import java.util.List;

public final class DepositType {

    public static final String MOCK = "deposit_mock";
    public static final String BANK = "deposit_bank";
    public static final String QR = "deposit_qr";
    public static final String CASH = "deposit_cash";
    public static final String TOYYIBPAY = "deposit_toyyibpay";
    /** Monthly rent bill via ToyyibPay (pending until gateway callback). */
    public static final String RENT_TOYYIBPAY = "rent_toyyibpay";
    /** Landlord recorded deposit as received (prototype ledger). */
    public static final String LANDLORD_MARKED = "deposit_landlord_marked";

    public static final List<String> COMPLETED_DEPOSIT_TYPES = Arrays.asList(MOCK, BANK, QR, CASH, TOYYIBPAY, LANDLORD_MARKED);

    private DepositType() {
    }
}
