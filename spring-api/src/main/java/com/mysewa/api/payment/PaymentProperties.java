package com.mysewa.api.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Manual bank/QR display + ToyyibPay credentials (configure via application.yml / env).
 */
@Component
@ConfigurationProperties(prefix = "app.payment")
public class PaymentProperties {

    /**
     * Public URL of this API (used for ToyyibPay callback). Localhost callbacks will not work — use ngrok in dev.
     */
    private String publicApiBaseUrl = "http://127.0.0.1:8090";

    /** Vite / frontend base URL for ToyyibPay return redirect. */
    private String frontReturnBase = "http://localhost:5173";

    private Manual manual = new Manual();
    private ToyyibPay toyyibpay = new ToyyibPay();

    /**
     * When true, students may call {@code POST .../deposit/reset-for-testing} on their own accepted applications
     * to delete deposit ledger rows and try ToyyibPay / manual flows again. Never enable in production.
     */
    private boolean devAllowDepositReset = false;

    public String getPublicApiBaseUrl() {
        return publicApiBaseUrl;
    }

    public void setPublicApiBaseUrl(String publicApiBaseUrl) {
        this.publicApiBaseUrl = publicApiBaseUrl;
    }

    public String getFrontReturnBase() {
        return frontReturnBase;
    }

    public void setFrontReturnBase(String frontReturnBase) {
        this.frontReturnBase = frontReturnBase;
    }

    public Manual getManual() {
        return manual;
    }

    public ToyyibPay getToyyibpay() {
        return toyyibpay;
    }

    public void setManual(Manual manual) {
        this.manual = manual;
    }

    public void setToyyibpay(ToyyibPay toyyibpay) {
        this.toyyibpay = toyyibpay;
    }

    public boolean isDevAllowDepositReset() {
        return devAllowDepositReset;
    }

    public void setDevAllowDepositReset(boolean devAllowDepositReset) {
        this.devAllowDepositReset = devAllowDepositReset;
    }

    public static class Manual {
        private String bankName = "MySewa Demo Bank";
        private String bankAccount = "8888123456789";
        private String bankHolder = "MySewa Demo Escrow";
        /** Optional HTTPS URL to a QR image (e.g. DuitNow PNG hosted by you). */
        private String qrImageUrl = "";

        public String getBankName() {
            return bankName;
        }

        public void setBankName(String bankName) {
            this.bankName = bankName;
        }

        public String getBankAccount() {
            return bankAccount;
        }

        public void setBankAccount(String bankAccount) {
            this.bankAccount = bankAccount;
        }

        public String getBankHolder() {
            return bankHolder;
        }

        public void setBankHolder(String bankHolder) {
            this.bankHolder = bankHolder;
        }

        public String getQrImageUrl() {
            return qrImageUrl;
        }

        public void setQrImageUrl(String qrImageUrl) {
            this.qrImageUrl = qrImageUrl;
        }
    }

    public static class ToyyibPay {
        private boolean enabled = false;
        private boolean sandbox = true;
        private String userSecretKey = "";
        private String categoryCode = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isSandbox() {
            return sandbox;
        }

        public void setSandbox(boolean sandbox) {
            this.sandbox = sandbox;
        }

        public String getUserSecretKey() {
            return userSecretKey;
        }

        public void setUserSecretKey(String userSecretKey) {
            this.userSecretKey = userSecretKey;
        }

        public String getCategoryCode() {
            return categoryCode;
        }

        public void setCategoryCode(String categoryCode) {
            this.categoryCode = categoryCode;
        }

        public boolean isConfigured() {
            return enabled && userSecretKey != null && !userSecretKey.isBlank()
                    && categoryCode != null && !categoryCode.isBlank();
        }
    }
}
