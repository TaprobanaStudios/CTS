package com.taprobanastudios.main.model;

import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import com.taprobanastudios.main.model.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "workers")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class Worker extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "contact_number", nullable = false)
    private String contactNumber;

    @Column(name = "nic_number", nullable = false)
    private String nicNumber;

    @Column(name = "address", nullable = false)
    private String address;

    // WORKER until an admin gives this person a login, then CLERK. Empty on rows saved before roles existed.
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private UserRole role;

    public UserRole getRole() {
        return role != null ? role : UserRole.WORKER;
    }

}
