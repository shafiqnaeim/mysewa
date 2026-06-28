package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import com.mysewa.api.service.IcCryptoService;
import com.mysewa.api.web.auth.AuthUserResponse;
import com.mysewa.api.web.auth.ProfileUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/users", "/api/users"})
@CrossOrigin
public class UserController {

    private final UserAccountRepository userAccountRepository;
    private final AuthService authService;
    private final IcCryptoService icCryptoService;

    public UserController(
            UserAccountRepository userAccountRepository,
            AuthService authService,
            IcCryptoService icCryptoService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.authService = authService;
        this.icCryptoService = icCryptoService;
    }

    @GetMapping
    public ResponseEntity<?> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        Page<UserAccount> pg = userAccountRepository.findAll(
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                        Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<AuthUserResponse> items = pg.getContent().stream()
                .map(u -> AuthUserResponse.from(u, icCryptoService))
                .collect(Collectors.toList());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("totalElements", pg.getTotalElements());
        body.put("page", pg.getNumber());
        body.put("size", pg.getSize());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id
    ) {
        UserAccount actor;
        try {
            actor = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (!canAccessUser(actor, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }
        Optional<UserAccount> target = userAccountRepository.findById(id);
        if (target.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(Map.of("user", AuthUserResponse.from(target.get(), icCryptoService)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id,
            @RequestBody ProfileUpdateRequest request
    ) {
        UserAccount actor;
        try {
            actor = authService.me(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (actor.getId() == null || !actor.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only update your own profile"));
        }
        try {
            UserAccount updated = authService.updateProfile(authorization, request);
            return ResponseEntity.ok(Map.of("user", AuthUserResponse.from(updated, icCryptoService)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @RequestMapping(value = "/{id}/status", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id,
            @RequestBody AdminAccountStatusRequest request
    ) {
        UserAccount admin;
        try {
            admin = requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (request == null || request.accountStatus == null || request.accountStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus is required"));
        }
        String normalized = request.accountStatus.trim().toLowerCase(Locale.ROOT);
        if (!"active".equals(normalized) && !"suspended".equals(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus must be active or suspended"));
        }
        if (admin.getId() != null && admin.getId().equals(id) && "suspended".equals(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot suspend your own administrator account"));
        }
        Optional<UserAccount> targetOpt = userAccountRepository.findById(id);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        UserAccount target = targetOpt.get();
        target.setAccountStatus(normalized);
        target.setUpdatedAt(LocalDateTime.now());
        UserAccount saved = userAccountRepository.save(target);
        return ResponseEntity.ok(Map.of("user", AuthUserResponse.from(saved, icCryptoService)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer id
    ) {
        UserAccount admin;
        try {
            admin = requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return authError(ex);
        }
        if (admin.getId() != null && admin.getId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot delete your own administrator account"));
        }
        if (!userAccountRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        userAccountRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    private boolean canAccessUser(UserAccount actor, Integer targetId) {
        if (actor.getId() != null && actor.getId().equals(targetId)) {
            return true;
        }
        String role = actor.getRole() != null ? actor.getRole().toLowerCase(Locale.ROOT) : "";
        return "admin".equals(role);
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        String role = user.getRole() != null ? user.getRole().toLowerCase(Locale.ROOT) : "";
        if (!"admin".equals(role)) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private ResponseEntity<Map<String, String>> authError(IllegalArgumentException ex) {
        String m = ex.getMessage() != null ? ex.getMessage() : "Unauthorized";
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("not found")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
