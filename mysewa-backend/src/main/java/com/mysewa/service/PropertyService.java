package com.mysewa.service;

import com.mysewa.dto.request.PropertyRequest;
import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Property;
import com.mysewa.model.User;
import com.mysewa.repository.PropertyRepository;
import com.mysewa.util.SecurityUtil;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> list(String status, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Property> slice = StringUtils.hasText(status)
                ? propertyRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim(), pr)
                : propertyRepository.findAllByOrderByCreatedAtDesc(pr);
        return slice.map(PropertyResponse::from);
    }

    @Transactional(readOnly = true)
    public PropertyResponse getById(Integer id) {
        return PropertyResponse.from(findProperty(id));
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> listByLandlord(Integer landlordId) {
        return propertyRepository.findByLandlord_IdOrderByUpdatedAtDesc(landlordId).stream()
                .map(PropertyResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> search(String location, String type, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Property> slice = propertyRepository.findAllByOrderByCreatedAtDesc(pr);
        return slice.map(PropertyResponse::from);
    }

    @Transactional
    public PropertyResponse create(PropertyRequest request) {
        User landlord = requireLandlord();
        LocalDateTime now = LocalDateTime.now();
        Property property = Property.builder()
                .landlord(landlord)
                .name(request.getName())
                .type(request.getType())
                .location(request.getLocation())
                .city(request.getCity())
                .state(request.getState())
                .rentalStyle(request.getRentalStyle())
                .acceptsMarriedHousehold(request.getAcceptsMarriedHousehold())
                .price(request.getPrice())
                .capacity(request.getCapacity())
                .description(request.getDescription())
                .amenities(request.getAmenities())
                .status(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "pending")
                .createdAt(now)
                .updatedAt(now)
                .build();
        return PropertyResponse.from(propertyRepository.save(property));
    }

    @Transactional
    public PropertyResponse update(Integer id, PropertyRequest request) {
        User landlord = requireLandlord();
        Property property = findProperty(id);
        if (property.getLandlord() == null || !property.getLandlord().getId().equals(landlord.getId())) {
            throw new UnauthorizedException("You can only update your own listings");
        }
        applyRequest(property, request);
        property.setUpdatedAt(LocalDateTime.now());
        return PropertyResponse.from(propertyRepository.save(property));
    }

    @Transactional
    public void delete(Integer id) {
        User landlord = requireLandlord();
        Property property = findProperty(id);
        if (property.getLandlord() == null || !property.getLandlord().getId().equals(landlord.getId())) {
            throw new UnauthorizedException("You can only delete your own listings");
        }
        propertyRepository.delete(property);
    }

    private Property findProperty(Integer id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));
    }

    private User requireLandlord() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.LANDLORD && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Landlord access required");
        }
        return user;
    }

    private static void applyRequest(Property property, PropertyRequest request) {
        if (request.getName() != null) property.setName(request.getName());
        if (request.getType() != null) property.setType(request.getType());
        if (request.getLocation() != null) property.setLocation(request.getLocation());
        if (request.getCity() != null) property.setCity(request.getCity());
        if (request.getState() != null) property.setState(request.getState());
        if (request.getRentalStyle() != null) property.setRentalStyle(request.getRentalStyle());
        if (request.getAcceptsMarriedHousehold() != null) property.setAcceptsMarriedHousehold(request.getAcceptsMarriedHousehold());
        if (request.getPrice() != null) property.setPrice(request.getPrice());
        if (request.getCapacity() != null) property.setCapacity(request.getCapacity());
        if (request.getDescription() != null) property.setDescription(request.getDescription());
        if (request.getAmenities() != null) property.setAmenities(request.getAmenities());
        if (request.getStatus() != null) property.setStatus(request.getStatus());
    }
}
