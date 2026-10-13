package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.CreateUserDto;
import com.taprobanastudios.main.dto.PasswordDto;
import com.taprobanastudios.main.dto.UserDto;
import com.taprobanastudios.main.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

// User management. The whole path is admin-only (see SecurityConfig).
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController extends AbstractController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return sendSuccessResponse(userService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<UserDto> createClerk(@RequestBody CreateUserDto createDto) {
        return sendCreatedResponse(userService.createClerk(createDto));
    }

    @PutMapping("/{userId}/password")
    public ResponseEntity<Void> resetPassword(@PathVariable UUID userId, @RequestBody PasswordDto passwordDto,
                                              Authentication authentication) {
        userService.resetPassword(userId, passwordDto.getNewPassword(), authentication.getName());
        return sendNoContentResponse();
    }

    @PutMapping("/{userId}/active")
    public ResponseEntity<Void> setActive(@PathVariable UUID userId, @RequestBody Map<String, Boolean> body,
                                          Authentication authentication) {
        userService.setActive(userId, Boolean.TRUE.equals(body.get("active")), authentication.getName());
        return sendNoContentResponse();
    }
}
