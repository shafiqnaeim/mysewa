package com.mysewa.api.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class ToyyibPayService {

    private static final ObjectMapper JSON = new ObjectMapper();
    private final RestTemplate http = new RestTemplate();
    private final PaymentProperties paymentProperties;

    public ToyyibPayService(PaymentProperties paymentProperties) {
        this.paymentProperties = paymentProperties;
    }

    public String createBillBaseUrl() {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        return tp.isSandbox()
                ? "https://dev.toyyibpay.com/index.php/api/createBill"
                : "https://toyyibpay.com/index.php/api/createBill";
    }

    public String payBaseUrl() {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        return tp.isSandbox() ? "https://dev.toyyibpay.com/" : "https://toyyibpay.com/";
    }

    /**
     * Creates a ToyyibPay bill. Amount is in RM; API expects amount in sen (1 RM = 100).
     *
     * @return bill code (URL slug)
     */
    public String createBill(
            BigDecimal amountRm,
            String orderId,
            String billReturnUrl,
            String billCallbackUrl,
            String billTo,
            String billEmail,
            String billPhone,
            String billName,
            String billDescription
    ) throws Exception {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        if (!tp.isConfigured()) {
            throw new IllegalStateException("ToyyibPay is not configured (enable + secret + category).");
        }

        int amountSen = amountRm.multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP).intValueExact();
        if (amountSen < 100) {
            amountSen = 100;
        }

        String safeName = sanitize(billName, 30);
        String safeDesc = sanitize(billDescription, 100);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("userSecretKey", tp.getUserSecretKey().trim());
        form.add("categoryCode", tp.getCategoryCode().trim());
        form.add("billName", safeName);
        form.add("billDescription", safeDesc);
        form.add("billPriceSetting", "1");
        form.add("billPayorInfo", "1");
        form.add("billAmount", String.valueOf(amountSen));
        form.add("billReturnUrl", billReturnUrl);
        form.add("billCallbackUrl", billCallbackUrl);
        form.add("billExternalReferenceNo", orderId);
        form.add("billTo", billTo != null ? billTo : "");
        form.add("billEmail", billEmail != null ? billEmail : "student@mysewa.local");
        form.add("billPhone", billPhone != null && !billPhone.isBlank() ? billPhone : "0000000000");
        form.add("billSplitPayment", "0");
        form.add("billPaymentChannel", "0");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAcceptCharset(java.util.Collections.singletonList(StandardCharsets.UTF_8));

        String url = createBillBaseUrl();
        String raw = http.postForObject(url, new HttpEntity<>(form, headers), String.class);
        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException("ToyyibPay returned an empty response.");
        }

        JsonNode root = JSON.readTree(raw);
        if (!root.isArray() || root.size() == 0) {
            throw new IllegalStateException("ToyyibPay error: " + raw);
        }
        JsonNode first = root.get(0);
        if (first.has("BillCode")) {
            return first.get("BillCode").asText();
        }
        if (first.has("status") && "error".equalsIgnoreCase(first.get("status").asText())) {
            String msg = first.has("msg") ? first.get("msg").asText() : raw;
            throw new IllegalStateException("ToyyibPay: " + msg);
        }
        throw new IllegalStateException("ToyyibPay unexpected JSON: " + raw);
    }

    private static String sanitize(String s, int maxLen) {
        if (s == null) {
            return "MySewa";
        }
        String t = s.replaceAll("[^a-zA-Z0-9 _]", "_").trim();
        if (t.isEmpty()) {
            t = "MySewa";
        }
        if (t.length() > maxLen) {
            return t.substring(0, maxLen);
        }
        return t;
    }

    public static String expectedCallbackHash(String userSecretKey, String status, String orderId, String refno) {
        String o = orderId == null ? "" : orderId;
        String r = refno == null ? "" : refno;
        String s = status == null ? "" : status;
        String base = userSecretKey + s + o + r + "ok";
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format(Locale.ROOT, "%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 not available", e);
        }
    }
}
