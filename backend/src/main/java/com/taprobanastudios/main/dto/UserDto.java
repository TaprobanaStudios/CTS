package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

// A user as shown to the application; never carries the password or its hash
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private UUID id;
    private String username;
    private String fullName;
    private UserRole role;
    private boolean active;
    private LocalDateTime createdAt;
    // The staff member behind this login, if any
    private UUID workerId;
}
