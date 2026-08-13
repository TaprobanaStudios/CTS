package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;


import com.taprobanastudios.main.model.enums.ProductionStatus;

@Entity
@Table(name = "production_items")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class ProductionItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private DailyProductionReport dailyProductionReport;

    @Column(name = "product_type", nullable = false)
    private String productType;

    @Column(name = "qty_produced")
    private Integer qtyProduced;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ProductionStatus status = ProductionStatus.STORED;

    @OneToMany(mappedBy = "productionItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ProductionMaterialUsage> materialUsages = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "productionItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ProductionProductUsage> productUsages = new java.util.ArrayList<>();

    @Column(name = "damages")
    private Integer damages;
}