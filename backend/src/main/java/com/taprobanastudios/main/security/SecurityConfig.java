package com.taprobanastudios.main.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.taprobanastudios.main.model.AppUser;
import com.taprobanastudios.main.model.enums.UserRole;
import com.taprobanastudios.main.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

@Configuration
@Slf4j
public class SecurityConfig {

    // The signed-in session lives in this cookie. It is http-only, so page scripts cannot read it.
    public static final String SESSION_COOKIE = "cts_session";

    private static final String ADMIN = UserRole.ADMIN.name();
    private static final String[] PUBLIC_PATHS = {"/api/auth/login", "/api/auth/logout", "/api/auth/token"};

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AppUserRepository userRepository) throws Exception {
        http
                // No server-side session and no form posts: the cookie is SameSite=Strict, so other
                // sites cannot make the browser send it
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // The only doors open without a token: getting one, and giving it up
                        .requestMatchers(PUBLIC_PATHS).permitAll()

                        // Admin only: people, money, history, and correcting saved records
                        .requestMatchers("/api/users/**", "/api/workers/**", "/api/dashboard/**", "/api/history/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/inventory/bin/**").hasRole(ADMIN)
                        // The raw production log and every sale belong to admins. Clerks record production
                        // and read the bin cards, which need product stock but never prices.
                        .requestMatchers("/api/production/items/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/sales/products").authenticated()
                        .requestMatchers("/api/sales/**").hasRole(ADMIN)
                        .requestMatchers("/actuator/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").hasRole(ADMIN)

                        // Everything else (inventory, bin cards, recording production) needs a valid token
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(sessionTokenResolver())
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(currentUserConverter(userRepository)))
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Please sign in"))
                        .accessDeniedHandler((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN, "You do not have permission to do this")))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Please sign in"))
                        .accessDeniedHandler((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN, "You do not have permission to do this")));
        return http.build();
    }

    // Browsers send the token in the session cookie; API clients send "Authorization: Bearer <token>"
    private BearerTokenResolver sessionTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return request -> {
            // Signing in and out must work even with a stale or broken token
            if (List.of(PUBLIC_PATHS).contains(request.getRequestURI())) {
                return null;
            }
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if (SESSION_COOKIE.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                        return cookie.getValue();
                    }
                }
            }
            return headerResolver.resolve(request);
        };
    }

    // A valid signature is not enough: the account must still exist, be active, and the token must
    // not predate a password reset. Roles are read from the account, not trusted from the token.
    private Converter<Jwt, AbstractAuthenticationToken> currentUserConverter(AppUserRepository userRepository) {
        return jwt -> {
            AppUser user = userRepository.findByUsername(jwt.getSubject())
                    .filter(AppUser::isActive)
                    .filter(account -> jwt.getIssuedAt() != null && !jwt.getIssuedAt().isBefore(account.getSessionsValidFrom()))
                    .orElseThrow(() -> new BadCredentialsException("Session is no longer valid"));
            return new JwtAuthenticationToken(jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())), user.getUsername());
        };
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Signing key for session tokens. Set JWT_SECRET (32+ characters) so sessions survive a restart.
    @Bean
    public SecretKey jwtSigningKey(@Value("${JWT_SECRET:}") String configuredSecret) {
        byte[] key;
        if (configuredSecret != null && configuredSecret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            key = configuredSecret.getBytes(StandardCharsets.UTF_8);
        } else {
            key = new byte[48];
            new SecureRandom().nextBytes(key);
            key = Base64.getEncoder().encode(key);
            log.warn("JWT_SECRET is not set (or shorter than 32 characters): using a temporary key. "
                    + "Everyone will have to sign in again after each restart.");
        }
        return new SecretKeySpec(key, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
    }
}
