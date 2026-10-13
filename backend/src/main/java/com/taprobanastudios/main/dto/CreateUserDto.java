package com.taprobanastudios.main.dto;

import lombok.Data;

// Gives a staff member a clerk login; created by an admin
@Data
public class CreateUserDto {
    // The staff member who becomes a clerk; their name is used for the account
    private java.util.UUID workerId;
    private String username;
    private String password;
}
