package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MaterialUsageDto {
    private UUID itemId;
    private String itemName;
    private BigDecimal amount;
    private com.taprobanastudios.main.model.enums.UnitOfMeasure unitOfMeasure;
    private UUID batchId;
    private String batchCode;
    private BigDecimal unitCost;
}
