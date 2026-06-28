package com.mysewa.service;

import com.mysewa.dto.response.UserResponse;
import com.mysewa.exception.ResourceNotFoundException;
import com.mysewa.model.User;
import com.mysewa.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listAll(int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.findAll(pr).map(UserResponse::from);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Integer id) {
        return UserResponse.from(findUser(id));
    }

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
