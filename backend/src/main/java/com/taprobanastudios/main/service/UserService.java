package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.CreateUserDto;
import com.taprobanastudios.main.dto.UserDto;
import com.taprobanastudios.main.model.AppUser;
import com.taprobanastudios.main.model.Worker;

import java.util.List;
import java.util.UUID;

public interface UserService {
    // Returns the account if the username and password are right and it is active
    AppUser authenticate(String username, String password);

    UserDto getByUsername(String username);

    List<UserDto> getAllUsers();

    // An admin turns a staff member into a clerk by giving them a username and password
    UserDto createClerk(CreateUserDto createDto);

    // An admin sets a new password for a clerk; the clerk's open sessions end
    void resetPassword(UUID userId, String newPassword, String actingUsername);

    void setActive(UUID userId, boolean active, String actingUsername);

    // Keeps a staff member's login in step with their record: same name, and no access once they are deactivated
    void syncWithStaff(Worker worker);

    // An admin changes their own password
    void changeOwnPassword(String username, String currentPassword, String newPassword);

    // Creates the first admin account when the system has no users yet
    void createInitialAdmin(String username, String password);

    UserDto toDto(AppUser user);
}
