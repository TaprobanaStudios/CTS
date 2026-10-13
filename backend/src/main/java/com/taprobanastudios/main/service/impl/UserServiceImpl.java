package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.CreateUserDto;
import com.taprobanastudios.main.dto.UserDto;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.exception.UnauthorizedException;
import com.taprobanastudios.main.model.AppUser;
import com.taprobanastudios.main.model.Worker;
import com.taprobanastudios.main.model.enums.UserRole;
import com.taprobanastudios.main.repository.AppUserRepository;
import com.taprobanastudios.main.repository.WorkerRepository;
import com.taprobanastudios.main.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final int MIN_PASSWORD_LENGTH = 8;
    // Same message whether the username or the password is wrong, so neither can be guessed
    private static final String BAD_LOGIN = "Invalid username or password";

    private static final String STAFF_ACTIVE = "ACTIVE";

    private final AppUserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public AppUser authenticate(String username, String password) {
        if (username == null || password == null) {
            throw new UnauthorizedException(BAD_LOGIN);
        }
        AppUser user = userRepository.findByUsername(normalize(username))
                .orElseThrow(() -> new UnauthorizedException(BAD_LOGIN));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException(BAD_LOGIN);
        }
        if (!user.isActive()) {
            throw new UnauthorizedException("This account has been deactivated. Ask an admin to reactivate it.");
        }
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getByUsername(String username) {
        return toDto(userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtAsc().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDto createClerk(CreateUserDto createDto) {
        String username = normalize(createDto.getUsername());
        if (!username.matches("[a-z0-9._-]{3,30}")) {
            throw new BadRequestException(
                    "Username must be 3 to 30 characters: letters, numbers, dot, dash or underscore");
        }
        if (createDto.getWorkerId() == null) {
            throw new BadRequestException("Choose the staff member who becomes a clerk");
        }
        Worker worker = workerRepository.findById(createDto.getWorkerId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found for ID: " + createDto.getWorkerId()));
        if (!STAFF_ACTIVE.equals(worker.getStatus())) {
            throw new BadRequestException(worker.getName() + " is deactivated. Reactivate them on the Staff page first.");
        }
        if (userRepository.findByWorkerId(worker.getId()).isPresent()) {
            throw new BadRequestException(worker.getName() + " already has a login");
        }
        requireStrongEnough(createDto.getPassword());
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("The username \"" + username + "\" is already taken");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setFullName(worker.getName());
        user.setWorker(worker);
        user.setPasswordHash(passwordEncoder.encode(createDto.getPassword()));
        user.setRole(UserRole.CLERK);
        user.setActive(true);
        worker.setRole(UserRole.CLERK);
        log.info("Creating clerk account {} for staff member {}", username, worker.getId());
        return toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void resetPassword(UUID userId, String newPassword, String actingUsername) {
        AppUser user = find(userId);
        if (user.getUsername().equals(actingUsername)) {
            throw new BadRequestException("Use \"Change my password\" to change your own password");
        }
        if (user.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("Another admin's password cannot be set here");
        }
        requireStrongEnough(newPassword);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        endSessions(user);
        log.info("Password of {} reset by {}", user.getUsername(), actingUsername);
    }

    @Override
    @Transactional
    public void setActive(UUID userId, boolean active, String actingUsername) {
        AppUser user = find(userId);
        if (user.getUsername().equals(actingUsername)) {
            throw new BadRequestException("You cannot deactivate your own account");
        }
        if (user.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("An admin account cannot be deactivated here");
        }
        if (active && user.getWorker() != null && !STAFF_ACTIVE.equals(user.getWorker().getStatus())) {
            throw new BadRequestException(user.getFullName() + " is deactivated as a staff member. Reactivate them on the Staff page first.");
        }
        user.setActive(active);
        if (!active) {
            endSessions(user);
        }
        log.info("{} {} by {}", user.getUsername(), active ? "activated" : "deactivated", actingUsername);
    }

    @Override
    @Transactional
    public void syncWithStaff(Worker worker) {
        userRepository.findByWorkerId(worker.getId()).ifPresent(user -> {
            user.setFullName(worker.getName());
            if (!STAFF_ACTIVE.equals(worker.getStatus()) && user.isActive()) {
                user.setActive(false);
                endSessions(user);
                log.info("{} deactivated because the staff member was deactivated", user.getUsername());
            }
        });
    }

    @Override
    @Transactional
    public void changeOwnPassword(String username, String currentPassword, String newPassword) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Your current password is not correct");
        }
        requireStrongEnough(newPassword);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        log.info("{} changed their own password", username);
    }

    @Override
    @Transactional
    public void createInitialAdmin(String username, String password) {
        if (userRepository.count() > 0) {
            return;
        }
        AppUser admin = new AppUser();
        admin.setUsername(normalize(username));
        admin.setFullName("Administrator");
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(UserRole.ADMIN);
        admin.setActive(true);
        userRepository.save(admin);
        log.warn("Created the first admin account \"{}\". Sign in and change its password.", admin.getUsername());
    }

    @Override
    public UserDto toDto(AppUser user) {
        return new UserDto(user.getId(), user.getUsername(), user.getFullName(), user.getRole(), user.isActive(),
                user.getCreatedAt(), user.getWorker() != null ? user.getWorker().getId() : null);
    }

    private AppUser find(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for ID: " + userId));
    }

    // Tokens carry whole seconds, so the cut-off is rounded up to the next one
    private void endSessions(AppUser user) {
        user.setSessionsValidFrom(Instant.now().truncatedTo(ChronoUnit.SECONDS).plusSeconds(1));
    }

    private void requireStrongEnough(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
    }

    private String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }
}
