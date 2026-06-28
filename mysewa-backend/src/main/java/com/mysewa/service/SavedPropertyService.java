package com.mysewa.service;

import com.mysewa.dto.response.PropertyResponse;
import com.mysewa.enums.Role;
import com.mysewa.exception.BadRequestException;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.exception.UnauthorizedException;
import com.mysewa.model.Property;
import com.mysewa.model.SavedProperty;
import com.mysewa.model.User;
import com.mysewa.repository.PropertyRepository;
import com.mysewa.repository.SavedPropertyRepository;
import com.mysewa.util.SecurityUtil;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedPropertyService {

    private final SavedPropertyRepository savedPropertyRepository;
    private final PropertyRepository propertyRepository;

    public SavedPropertyService(SavedPropertyRepository savedPropertyRepository, PropertyRepository propertyRepository) {
        this.savedPropertyRepository = savedPropertyRepository;
        this.propertyRepository = propertyRepository;
    }

    @Transactional
    public PropertyResponse save(Integer propertyId) {
        User student = requireStudent();
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));
        if (savedPropertyRepository.existsByStudent_IdAndProperty_Id(student.getId(), propertyId)) {
            throw new BadRequestException("Property already saved");
        }
        SavedProperty row = SavedProperty.builder()
                .student(student)
                .property(property)
                .createdAt(LocalDateTime.now())
                .build();
        savedPropertyRepository.save(row);
        return PropertyResponse.from(property);
    }

    @Transactional
    public void remove(Integer propertyId) {
        User student = requireStudent();
        savedPropertyRepository.deleteByStudent_IdAndProperty_Id(student.getId(), propertyId);
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> listForStudent() {
        User student = requireStudent();
        return savedPropertyRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .map(sp -> PropertyResponse.from(sp.getProperty()))
                .collect(Collectors.toList());
    }

    private User requireStudent() {
        User user = SecurityUtil.currentUser();
        if (user.getRole() != Role.STUDENT) {
            throw new UnauthorizedException("Student access required");
        }
        return user;
    }
}
