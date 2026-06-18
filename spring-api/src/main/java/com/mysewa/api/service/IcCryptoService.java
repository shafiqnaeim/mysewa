package com.mysewa.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.regex.Pattern;

/**
 * Encrypts Malaysian NRIC-style identifiers at rest (AES-256-GCM).
 * Stored values are prefixed with {@code v1:} so legacy plaintext rows can still be read.
 */
@Service
public class IcCryptoService {

    private static final String PREFIX = "v1:";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;
    private static final Pattern LEGACY_IC = Pattern.compile("^\\d{6}-\\d{2}-\\d{4}$");

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public IcCryptoService(@Value("${app.security.ic-encryption-key:}") String keyMaterial) {
        this.secretKey = buildKey(keyMaterial);
    }

    private static SecretKey buildKey(String keyMaterial) {
        String source = (keyMaterial == null || keyMaterial.isBlank())
                ? "MySewaIcEncryptionKey-ChangeInProduction-32B!"
                : keyMaterial.trim();
        try {
            byte[] raw = source.getBytes(StandardCharsets.UTF_8);
            if (raw.length == 32) {
                return new SecretKeySpec(raw, "AES");
            }
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] digest = sha256.digest(raw);
            return new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Unable to build IC encryption key", e);
        }
    }

    /** Persist ciphertext with version prefix. */
    public String encryptForStorage(String plainIc) {
        if (plainIc == null || plainIc.isBlank()) {
            return plainIc;
        }
        String trimmed = plainIc.trim();
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(trimmed.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buf = ByteBuffer.allocate(iv.length + cipherText.length);
            buf.put(iv);
            buf.put(cipherText);
            return PREFIX + Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            throw new IllegalStateException("IC encryption failed", e);
        }
    }

    /**
     * Returns plaintext for API responses. Legacy DB values without {@code v1:} prefix
     * are returned as-is when they still match the NRIC display pattern.
     */
    public String decryptForDisplay(String stored) {
        if (stored == null || stored.isBlank()) {
            return stored;
        }
        String s = stored.trim();
        if (!s.startsWith(PREFIX)) {
            return LEGACY_IC.matcher(s).matches() ? s : s;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(s.substring(PREFIX.length()));
            if (decoded.length < GCM_IV_LENGTH + 2) {
                return s;
            }
            byte[] iv = Arrays.copyOfRange(decoded, 0, GCM_IV_LENGTH);
            byte[] cipherBytes = Arrays.copyOfRange(decoded, GCM_IV_LENGTH, decoded.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] plain = cipher.doFinal(cipherBytes);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
