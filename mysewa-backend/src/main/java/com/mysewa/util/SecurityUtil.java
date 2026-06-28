package com.mysewa.util;

import com.mysewa.config.SecurityUser;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtil {

    private SecurityUtil() {
    }

    public static User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof SecurityUser securityUser)) {
            throw new UnauthorizedException("Authentication required");
        }
        return securityUser.getUser();
    }

    public static User currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof SecurityUser securityUser)) {
            return null;
        }
        return securityUser.getUser();
    }
}
