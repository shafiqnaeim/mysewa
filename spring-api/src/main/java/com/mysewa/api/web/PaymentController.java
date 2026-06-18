package com.mysewa.api.web;

import com.mysewa.api.domain.FinancialTransaction;
import com.mysewa.api.payment.DepositType;
import com.mysewa.api.payment.PaymentProperties;
import com.mysewa.api.payment.ToyyibPayService;
import com.mysewa.api.repo.FinancialTransactionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Public payment instructions + ToyyibPay server callback (no JWT — verified by Toyyib hash).
 */
@RestController
@RequestMapping("/api/v1/payments")
@CrossOrigin
public class PaymentController {

    private final PaymentProperties paymentProperties;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ToyyibPayService toyyibPayService;

    public PaymentController(
            PaymentProperties paymentProperties,
            FinancialTransactionRepository financialTransactionRepository,
            ToyyibPayService toyyibPayService
    ) {
        this.paymentProperties = paymentProperties;
        this.financialTransactionRepository = financialTransactionRepository;
        this.toyyibPayService = toyyibPayService;
    }

    @GetMapping("/manual-instructions")
    public ResponseEntity<Map<String, Object>> manualInstructions() {
        PaymentProperties.Manual m = paymentProperties.getManual();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("bankName", m.getBankName());
        body.put("bankAccount", m.getBankAccount());
        body.put("bankHolder", m.getBankHolder());
        body.put("qrImageUrl", StringUtils.hasText(m.getQrImageUrl()) ? m.getQrImageUrl() : null);
        body.put("note", "Transfer the deposit amount shown on MySewa, then confirm in the app. QR/Cash are prototype flows for FYP.");
        return ResponseEntity.ok(body);
    }

    @GetMapping("/toyyibpay/options")
    public ResponseEntity<Map<String, Object>> toyyibOptions() {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        Map<String, Object> body = new LinkedHashMap<>();
        boolean configured = tp.isConfigured();
        body.put("enabled", configured);
        body.put("sandbox", tp.isSandbox());
        if (!configured) {
            String hint;
            if (!tp.isEnabled()) {
                hint = "Set TOYYIBPAY_ENABLED=true on the Spring API process, then restart.";
            } else if (!StringUtils.hasText(tp.getUserSecretKey())) {
                hint = "Set TOYYIBPAY_USER_SECRET_KEY on the Spring API process (IDE env or shell), then restart.";
            } else if (!StringUtils.hasText(tp.getCategoryCode())) {
                hint = "Set TOYYIBPAY_CATEGORY_CODE on the Spring API process, then restart.";
            } else {
                hint = "ToyyibPay is not fully configured.";
            }
            body.put("setupHint", hint);
        }
        body.put("depositResetAllowed", paymentProperties.isDevAllowDepositReset());
        return ResponseEntity.ok(body);
    }

    @PostMapping(value = "/toyyibpay/callback")
    public ResponseEntity<String> toyyibPayCallback(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "order_id", required = false) String orderId,
            @RequestParam(value = "refno", required = false) String refno,
            @RequestParam(value = "hash", required = false) String receivedHash,
            @RequestParam(value = "billcode", required = false) String billcode
    ) {
        PaymentProperties.ToyyibPay tp = paymentProperties.getToyyibpay();
        if (!tp.isConfigured()) {
            return ResponseEntity.status(503).body("NOT_CONFIGURED");
        }
        String secret = tp.getUserSecretKey().trim();
        String st = status == null ? "" : status.trim();
        String oid = orderId == null ? "" : orderId.trim();
        String rf = refno == null ? "" : refno.trim();
        String expected = ToyyibPayService.expectedCallbackHash(secret, st, oid, rf);
        String got = receivedHash == null ? "" : receivedHash.trim().toLowerCase(Locale.ROOT);
        if (!expected.equalsIgnoreCase(got)) {
            return ResponseEntity.badRequest().body("BAD_HASH");
        }
        if (!"1".equals(st)) {
            return ResponseEntity.ok("IGNORED_STATUS");
        }
        String bc = billcode == null ? "" : billcode.trim();
        if (!StringUtils.hasText(bc)) {
            return ResponseEntity.badRequest().body("MISSING_BILLCODE");
        }
        Optional<FinancialTransaction> opt = financialTransactionRepository.findByExternalRefAndTypeAndStatus(
                bc,
                DepositType.TOYYIBPAY,
                "pending"
        );
        if (opt.isEmpty()) {
            opt = financialTransactionRepository.findByExternalRefAndTypeAndStatus(
                    bc,
                    DepositType.RENT_TOYYIBPAY,
                    "pending"
            );
        }
        if (opt.isEmpty()) {
            return ResponseEntity.ok("NO_PENDING");
        }
        FinancialTransaction tx = opt.get();
        if ("completed".equalsIgnoreCase(tx.getStatus())) {
            return ResponseEntity.ok("ALREADY_DONE");
        }
        tx.setStatus("completed");
        financialTransactionRepository.save(tx);
        return ResponseEntity.ok("OK");
    }
}
