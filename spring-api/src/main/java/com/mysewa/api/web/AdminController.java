package com.mysewa.api.web;

import com.mysewa.api.domain.UserAccount;
import com.mysewa.api.repo.ApplicationRepository;
import com.mysewa.api.repo.PropertyRepository;
import com.mysewa.api.repo.UniversityRepository;
import com.mysewa.api.repo.UserAccountRepository;
import com.mysewa.api.service.AuthService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@CrossOrigin
public class AdminController {

    private final UserAccountRepository userAccountRepository;
    private final PropertyRepository propertyRepository;
    private final ApplicationRepository applicationRepository;
    private final UniversityRepository universityRepository;
    private final AuthService authService;

    public AdminController(
            UserAccountRepository userAccountRepository,
            PropertyRepository propertyRepository,
            ApplicationRepository applicationRepository,
            UniversityRepository universityRepository,
            AuthService authService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.propertyRepository = propertyRepository;
        this.applicationRepository = applicationRepository;
        this.universityRepository = universityRepository;
        this.authService = authService;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        long usersTotal = userAccountRepository.count();
        long students = userAccountRepository.countByRoleIgnoreCase("student");
        long landlords = userAccountRepository.countByRoleIgnoreCase("landlord");
        long admins = userAccountRepository.countByRoleIgnoreCase("admin");
        long propertiesTotal = propertyRepository.count();
        long applicationsTotal = applicationRepository.count();
        long applicationsPending = applicationRepository.countByStatusIgnoreCase("pending");
        long applicationsAccepted = applicationRepository.countByStatusIgnoreCase("accepted");
        long applicationsRejected = applicationRepository.countByStatusIgnoreCase("rejected");
        long universitiesTotal = universityRepository.count();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("usersTotal", usersTotal);
        body.put("usersStudents", students);
        body.put("usersLandlords", landlords);
        body.put("usersAdmins", admins);
        body.put("propertiesTotal", propertiesTotal);
        body.put("applicationsTotal", applicationsTotal);
        body.put("applicationsPending", applicationsPending);
        body.put("applicationsAccepted", applicationsAccepted);
        body.put("applicationsRejected", applicationsRejected);
        body.put("universitiesTotal", universitiesTotal);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        try {
            requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);
        Page<UserAccount> pg = userAccountRepository.findAll(
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<AdminUserRowResponse> items = pg.getContent().stream().map(AdminUserRowResponse::from).collect(Collectors.toList());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("totalElements", pg.getTotalElements());
        body.put("totalPages", pg.getTotalPages());
        body.put("page", pg.getNumber());
        body.put("size", pg.getSize());
        return ResponseEntity.ok(body);
    }

    @RequestMapping(value = "/users/{id}/account-status", method = { RequestMethod.PATCH, RequestMethod.PUT })
    public ResponseEntity<?> updateUserAccountStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("id") Integer userId,
            @RequestBody AdminAccountStatusRequest request
    ) {
        UserAccount admin;
        try {
            admin = requireAdmin(authorization);
        } catch (IllegalArgumentException ex) {
            return adminAuthError(ex);
        }

        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User id is required"));
        }
        String raw = request == null || request.accountStatus == null ? "" : request.accountStatus.trim();
        if (raw.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus is required"));
        }
        String normalized = raw.toLowerCase();
        if (!"active".equals(normalized) && !"suspended".equals(normalized)) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountStatus must be active or suspended"));
        }

        if (admin.getId() != null && admin.getId().equals(userId) && "suspended".equals(normalized)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message",
                    "You cannot suspend your own administrator account while signed in."
            ));
        }

        Optional<UserAccount> targetOpt = userAccountRepository.findById(userId);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        UserAccount target = targetOpt.get();
        target.setAccountStatus(normalized);
        target.setUpdatedAt(LocalDateTime.now());
        UserAccount saved = userAccountRepository.save(target);
        return ResponseEntity.ok(Map.of("item", AdminUserRowResponse.from(saved)));
    }

    private UserAccount requireAdmin(String authorization) {
        UserAccount user = authService.me(authorization);
        if (!"admin".equalsIgnoreCase(String.valueOf(user.getRole()))) {
            throw new IllegalArgumentException("Administrator access required");
        }
        return user;
    }

    private static ResponseEntity<?> adminAuthError(IllegalArgumentException ex) {
        String m = ex.getMessage() == null ? "" : ex.getMessage();
        if (m.contains("token") || m.contains("Missing bearer") || m.contains("Invalid or expired")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", m));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", m));
    }
}
