package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.LoginRequestDto;
import com.taprobanastudios.main.dto.PasswordDto;
import com.taprobanastudios.main.dto.TokenResponseDto;
import com.taprobanastudios.main.dto.UserDto;
import com.taprobanastudios.main.model.AppUser;
import com.taprobanastudios.main.security.JwtService;
import com.taprobanastudios.main.security.SecurityConfig;
import com.taprobanastudios.main.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController extends AbstractController {

    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<UserDto> login(@RequestBody LoginRequestDto loginDto, HttpServletRequest request) {
        AppUser user = userService.authenticate(loginDto.getUsername(), loginDto.getPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE,
                        sessionCookie(jwtService.issueToken(user), JwtService.SESSION_LENGTH, request).toString())
                .body(userService.toDto(user));
    }

    // For API clients (Postman, Swagger, scripts): the same check as login, but the token comes back
    // in the answer to be sent as "Authorization: Bearer <token>". No cookie is set.
    @PostMapping("/token")
    public ResponseEntity<TokenResponseDto> token(@RequestBody LoginRequestDto loginDto) {
        AppUser user = userService.authenticate(loginDto.getUsername(), loginDto.getPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new TokenResponseDto(jwtService.issueToken(user), "Bearer",
                        JwtService.SESSION_LENGTH.toSeconds(), userService.toDto(user)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, sessionCookie("", Duration.ZERO, request).toString())
                .build();
    }

    // Who is signed in; the frontend uses this to decide what to show
    @GetMapping("/me")
    public ResponseEntity<UserDto> me(Authentication authentication) {
        return sendSuccessResponse(userService.getByUsername(authentication.getName()));
    }

    // Clerks' passwords are set by an admin; only admins change their own
    @PostMapping("/change-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> changeOwnPassword(@RequestBody PasswordDto passwordDto, Authentication authentication) {
        userService.changeOwnPassword(authentication.getName(), passwordDto.getCurrentPassword(),
                passwordDto.getNewPassword());
        return sendNoContentResponse();
    }

    // http-only: page scripts cannot read it. SameSite=Strict: other sites cannot make the browser send it.
    private ResponseCookie sessionCookie(String value, Duration maxAge, HttpServletRequest request) {
        return ResponseCookie.from(SecurityConfig.SESSION_COOKIE, value)
                .httpOnly(true)
                .secure(request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto")))
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
