package com.taprobanastudios.main.model;

import com.taprobanastudios.main.audit.Auditable;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "product_sales")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class ProductSale extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    // Manufactured products are identified by name, as in production_items.product_type
    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Selling price per piece
    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    // Material cost per piece at the time of sale; null when no production of it had costed materials
    @Column(name = "unit_material_cost", precision = 12, scale = 2)
    private BigDecimal unitMaterialCost;

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
