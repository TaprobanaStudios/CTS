package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.UnitOfMeasure;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

// One loaded stock of a material that still has quantity left
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockBatchDto {
    private UUID batchId;
    private String batchCode;
    private UUID itemId;
    private String itemName;
    private UnitOfMeasure unitOfMeasure;
    private LocalDate receivedDate;
    private BigDecimal qtyReceived;
    private BigDecimal remainingQty;
    private BigDecimal unitCost;
}
