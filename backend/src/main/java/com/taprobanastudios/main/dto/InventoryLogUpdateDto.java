package com.taprobanastudios.main.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

// A correction to one bin card entry
@Data
public class InventoryLogUpdateDto {
    private LocalDate transactionDate;
    // The quantity loaded or deducted, whichever the entry is
    private BigDecimal quantity;
    // Loads only; null clears it
    private BigDecimal unitCost;
    private String authorizedBy;
    private String remarks;
    private String editedBy;
    // Why the entry is being corrected (optional)
    private String editRemark;
}
