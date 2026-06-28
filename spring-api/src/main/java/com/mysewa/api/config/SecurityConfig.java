package com.mysewa.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_AUTH = {
            "/api/v1/auth/register",
            "/api/auth/register",
            "/api/v1/auth/login",
            "/api/auth/login",
            "/api/v1/auth/verify-email",
            "/api/auth/verify-email",
            "/api/v1/auth/forgot-password",
            "/api/auth/forgot-password",
            "/api/v1/auth/resend-verification",
            "/api/auth/resend-verification",
            "/api/v1/auth/reset-password",
            "/api/auth/reset-password",
            "/api/v1/auth/logout",
            "/api/auth/logout",
    };

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_AUTH).permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/properties/**",
                                "/api/properties/**",
                                "/api/v1/universities",
                                "/api/universities",
                                "/api/v1/payments/manual-instructions",
                                "/api/payments/manual-instructions",
                                "/api/v1/payments/toyyibpay/options",
                                "/api/payments/toyyibpay/options",
                                "/uploads/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/payments/toyyibpay/callback",
                                "/api/payments/toyyibpay/callback"
                        ).permitAll()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8888",
                "http://127.0.0.1:8888"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
