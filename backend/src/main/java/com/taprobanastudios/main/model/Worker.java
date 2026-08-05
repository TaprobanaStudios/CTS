package com.taprobanastudios.main.model;

import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

}
