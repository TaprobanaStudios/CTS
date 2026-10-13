package com.taprobanastudios.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// What an API client gets for a username and password: send accessToken as "Authorization: Bearer <token>"
@Data
@AllArgsConstructor
public class TokenResponseDto {
    private String accessToken;
    private String tokenType;
    // Seconds until the token stops working
    private long expiresIn;
    private UserDto user;
}
