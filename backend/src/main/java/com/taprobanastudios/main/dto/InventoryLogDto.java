package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class InventoryLogDto {
    private UUID id;
    private ItemDto item;
    private LocalDate transactionDate;
    private BigDecimal openingStock;
    private BigDecimal qtyIn;
    private BigDecimal qtyOut;
    private BigDecimal closingStock;
    private BigDecimal unitCost;
    // Stock ID: the load's own, or the stock a deduction was taken from
    private UUID batchId;
    private String batchCode;
    private String authorizedBy;
    private String remarks;
    // true for deductions made automatically by a production entry: those cannot be edited
    private boolean productionDeduction;
    private String editedBy;
    private java.time.LocalDateTime editedAt;
    private Integer editCount;
    private String editNote;
}
