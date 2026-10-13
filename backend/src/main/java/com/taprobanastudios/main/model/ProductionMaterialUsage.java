package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "production_material_usages")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class ProductionMaterialUsage extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_item_id", nullable = false)
    private ProductionItem productionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal amount;

    // The stock this material was taken from, when it came from a single one
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private InventoryLog batch;

    // Buying cost per unit at the time of use; null when the stock had no cost recorded
    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;
}
