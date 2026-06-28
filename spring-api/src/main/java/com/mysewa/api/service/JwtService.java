package com.mysewa.api.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final long DEFAULT_TTL_MS = 24L * 60 * 60 * 1000;

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.auth.jwt-secret:mySecretKey}") String jwtSecret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
    ) {
        this.signingKey = deriveSigningKey(jwtSecret);
        this.expirationMs = expirationMs > 0 ? expirationMs : DEFAULT_TTL_MS;
    }

    public String generateToken(Integer userId) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey, SignatureAlgorithm.HS512)
                .compact();
    }

    public Integer parseUserId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
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
        String raw = secret == null ? "" : secret.trim();
        if (raw.isEmpty()) {
            raw = "mySecretKey";
        }
        try {
            byte[] hashed = MessageDigest.getInstance("SHA-512").digest(raw.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-512 not available", ex);
        }
    }
}
