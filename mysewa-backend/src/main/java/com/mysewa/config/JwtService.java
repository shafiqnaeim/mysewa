package com.mysewa.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
    ) {
        this.signingKey = deriveSigningKey(secret);
        this.expirationMs = expirationMs;
    }

    public String generateToken(Integer userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey, Jwts.SIG.HS512)
                .compact();
    }

    public Integer parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Integer.parseInt(claims.getSubject());
    }

    public boolean isValid(String token) {
        try {
            parseUserId(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private static SecretKey deriveSigningKey(String secret) {
        String raw = secret == null || secret.isBlank() ? "mySecretKeyChangeMeInProduction1234567890" : secret.trim();
        try {
            byte[] hashed = MessageDigest.getInstance("SHA-512").digest(raw.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-512 not available", ex);
        }
    }
}
