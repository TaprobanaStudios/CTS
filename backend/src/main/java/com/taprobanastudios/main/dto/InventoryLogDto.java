package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class InventoryLogDto {
    private UUID id;
    private MaterialDto material;
    private LocalDate transactionDate;
    private BigDecimal openingStock;
    private BigDecimal qtyIn;
    private BigDecimal qtyOut;
    private BigDecimal closingStock;
    private String authorizedBy;
    private String remarks;
}
