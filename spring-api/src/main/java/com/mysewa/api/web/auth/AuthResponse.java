package com.mysewa.api.web.auth;

public class AuthResponse {
    public String message;
    public String token;
    public AuthUserResponse user;

    public static AuthResponse of(String message, String token, AuthUserResponse user) {
        AuthResponse response = new AuthResponse();
        response.message = message;
        response.token = token;
        response.user = user;
        return response;
    }
}
