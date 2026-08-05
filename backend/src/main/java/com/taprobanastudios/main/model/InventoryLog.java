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

    @Column(name = "authorized_by")
    private String authorizedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;
}
