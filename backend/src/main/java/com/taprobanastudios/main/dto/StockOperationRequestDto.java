package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class StockOperationRequestDto {
    private UUID itemId;
    private String itemName;
    private BigDecimal amount;
    // Loads: buying cost of the new stock. Deductions: cost to use for stocks that have none recorded
    private BigDecimal unitCost;
    // Deductions only: take from this stock instead of oldest-first
    private UUID batchId;
    private String authorizedBy;
    private String remarks;
}
