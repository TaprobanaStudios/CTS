package com.taprobanastudios.main.model;

import com.taprobanastudios.main.audit.Auditable;
import com.taprobanastudios.main.model.enums.UserRole;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class AppUser extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Stored in lower case; what the user signs in with
    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    // BCrypt hash; the password itself is never stored
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    // The staff member this login belongs to; empty for the first admin
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", unique = true)
    private Worker worker;

    // Sessions started before this moment stop working (password reset, deactivation)
    @Column(name = "sessions_valid_from", nullable = false)
    private Instant sessionsValidFrom = Instant.EPOCH;
}
