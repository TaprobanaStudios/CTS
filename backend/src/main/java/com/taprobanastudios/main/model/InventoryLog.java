package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;


@Entity
@Table(name = "inventory_logs")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class InventoryLog extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "opening_stock", precision = 10, scale = 2)
    private BigDecimal openingStock;

    @Column(name = "qty_in", precision = 10, scale = 2)
    private BigDecimal qtyIn;

    @Column(name = "qty_out", precision = 10, scale = 2)
    private BigDecimal qtyOut;

    @Column(name = "closing_stock", precision = 10, scale = 2)
    private BigDecimal closingStock;

    // Buying cost per unit of measure; optional on loads, copied from the source stock on deductions
    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    // Stock ID of a load, e.g. CEM-261013-01; null on deductions
    @Column(name = "batch_code")
    private String batchCode;

    // Quantity of a load that has not been used yet; null on deductions
    @Column(name = "remaining_qty", precision = 10, scale = 2)
    private BigDecimal remainingQty;

    // The load a deduction was taken from; null on loads and on deductions with no stock to draw on
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_batch_id")
    private InventoryLog sourceBatch;

    @Column(name = "authorized_by")
    private String authorizedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

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
