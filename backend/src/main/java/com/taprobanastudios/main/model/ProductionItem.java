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

    // Set when a user corrects the entry afterwards; null if it was never edited.
    // (modifiedAt cannot serve: it also changes on system updates such as stock being drawn down.)
    @Column(name = "edited_by")
    private String editedBy;

    @Column(name = "edited_at")
    private java.time.LocalDateTime editedAt;

    // How many times the entry has been corrected; null if never
    @Column(name = "edit_count")
    private Integer editCount;

    // About the latest correction: the reason given, or else what was changed
    @Column(name = "edit_note", columnDefinition = "TEXT")
    private String editNote;
}