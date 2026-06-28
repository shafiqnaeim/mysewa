package com.mysewa.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysewa.api.domain.PropertyEntity;
import com.mysewa.api.web.PropertyUpsertRequest;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PropertyService {

    public static final String FIXED_PAYMENT_DUE_DATE = "1st of every month";

    private static final ObjectMapper JSON = new ObjectMapper();

    public void applyRequest(PropertyEntity entity, PropertyUpsertRequest request, CampusProximityService campusProximity) {
        entity.setLandlordId(request.getLandlordId());
        entity.setName(trimOrNull(request.getName()));
        entity.setType(trimOrNull(request.getType()));
        entity.setLocation(trimOrNull(request.getLocation()));
        entity.setLatitude(request.getLatitude());
        entity.setLongitude(request.getLongitude());

        if (StringUtils.hasText(request.getCampus()) && StringUtils.hasText(request.getDistance())) {
            entity.setCampus(trimOrNull(request.getCampus()));
            entity.setDistance(trimOrNull(request.getDistance()));
        } else if (request.getLatitude() != null && request.getLongitude() != null) {
            var resolved = campusProximity.resolveFromCoordinates(request.getLatitude(), request.getLongitude());
            entity.setCampus(resolved.getOrDefault("campus", trimOrNull(request.getCampus())));
            entity.setDistance(resolved.getOrDefault("distance", trimOrNull(request.getDistance())));
        } else {
            entity.setCampus(trimOrNull(request.getCampus()));
            entity.setDistance(trimOrNull(request.getDistance()));
        }

        entity.setCity(trimOrNull(request.getCity()));
        entity.setState(trimOrNull(request.getState()));
        entity.setPostcode(trimOrNull(request.getPostcode()));
        entity.setRentalStyle(trimOrNull(request.getRentalStyle()));
        entity.setAcceptsMarriedHousehold(Boolean.TRUE.equals(request.getAcceptsMarriedHousehold()));
        entity.setGender(trimOrNull(request.getGender()));
        entity.setReligion(trimOrNull(request.getReligion()));
        entity.setRace(trimOrNull(request.getRace()));
        entity.setPrice(request.getPrice());
        entity.setCapacity(request.getCapacity());
        entity.setDescription(trimOrNull(request.getDescription()));
        entity.setAmenities(trimOrNull(request.getAmenities()));
        entity.setImages(trimOrNull(request.getImages()));
        entity.setStatus(trimOrNull(request.getStatus()));

        entity.setContactPhone(trimOrNull(request.getContactPhone()));
        entity.setContactEmail(trimOrNull(request.getContactEmail()));
        entity.setWhatsappNumber(trimOrNull(request.getWhatsappNumber()));
        entity.setPaymentMethods(serializePaymentMethods(request.getPaymentMethods()));
        entity.setPaymentDueDate(FIXED_PAYMENT_DUE_DATE);

        if (hasPaymentMethod(request.getPaymentMethods(), "online_banking")) {
            entity.setBankName(trimOrNull(request.getBankName()));
            entity.setAccountNumber(trimOrNull(request.getAccountNumber()));
            entity.setAccountHolder(trimOrNull(request.getAccountHolder()));
        } else {
            entity.setBankName(null);
            entity.setAccountNumber(null);
            entity.setAccountHolder(null);
        }

        if (hasPaymentMethod(request.getPaymentMethods(), "duitnow_qr")) {
            entity.setQrCodeUrl(trimOrNull(request.getQrCodeUrl()));
        } else {
            entity.setQrCodeUrl(null);
        }
    }

    public void validatePropertyRequest(PropertyUpsertRequest request) {
        if (!StringUtils.hasText(request.getName()) || !StringUtils.hasText(request.getType())
                || !StringUtils.hasText(request.getLocation())) {
            throw new IllegalArgumentException("Name, type and mailing address are required");
        }
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new IllegalArgumentException("Map pin location is required");
        }
        if (request.getPrice() == null || request.getPrice() <= 0) {
            throw new IllegalArgumentException("Price must be greater than 0");
        }
        if (request.getCapacity() != null && request.getCapacity() <= 0) {
            throw new IllegalArgumentException("Capacity must be greater than 0");
        }
        if (!StringUtils.hasText(request.getContactPhone())) {
            throw new IllegalArgumentException("Contact phone is required");
        }
        if (!StringUtils.hasText(request.getContactEmail())) {
            throw new IllegalArgumentException("Contact email is required");
        }
        if (request.getPaymentMethods() == null || request.getPaymentMethods().isEmpty()) {
            throw new IllegalArgumentException("At least one payment method is required");
        }
        if (hasPaymentMethod(request.getPaymentMethods(), "online_banking")) {
            if (!StringUtils.hasText(request.getBankName())) {
                throw new IllegalArgumentException("Bank name is required for Online Banking");
            }
            if (!StringUtils.hasText(request.getAccountNumber())) {
                throw new IllegalArgumentException("Account number is required for Online Banking");
            }
            if (!StringUtils.hasText(request.getAccountHolder())) {
                throw new IllegalArgumentException("Account holder name is required for Online Banking");
            }
        }
        if (hasPaymentMethod(request.getPaymentMethods(), "duitnow_qr")) {
            if (!StringUtils.hasText(request.getQrCodeUrl())) {
                throw new IllegalArgumentException("QR code image is required for DuitNow / QR");
            }
        }
    }

    public static List<String> parsePaymentMethods(String paymentMethodsJson) {
        if (!StringUtils.hasText(paymentMethodsJson)) {
            return Collections.emptyList();
        }
        try {
            List<String> methods = JSON.readValue(paymentMethodsJson, new TypeReference<List<String>>() {});
            return methods != null ? methods : Collections.emptyList();
        } catch (Exception ignored) {
            return Collections.emptyList();
        }
    }

    private static String serializePaymentMethods(List<String> methods) {
        if (methods == null || methods.isEmpty()) {
            return null;
        }
        try {
            return JSON.writeValueAsString(methods);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid payment methods");
        }
    }

    private static boolean hasPaymentMethod(List<String> methods, String method) {
        if (methods == null) {
            return false;
        }
        return methods.stream().anyMatch(m -> method.equalsIgnoreCase(m));
    }

    private static String trimOrNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
