package com.taprobanastudios.main.dto;

import lombok.Data;

@Data
public class PasswordDto {
    // Only when changing one's own password
    private String currentPassword;
    private String newPassword;
}
