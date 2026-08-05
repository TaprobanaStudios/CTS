package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;


@Entity
@Table(name = "items")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class Item extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure", nullable = false)
    private com.taprobanastudios.main.model.enums.UnitOfMeasure unitOfMeasure;

    @Column(name = "is_default_material", nullable = false)
    private boolean isDefaultMaterial = false;

    // One Item has Many Inventory Logs
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryLog> logs;
}
