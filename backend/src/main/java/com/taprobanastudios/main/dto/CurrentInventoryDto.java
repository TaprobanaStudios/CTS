package com.taprobanastudios.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CurrentInventoryDto {
    private UUID itemId;
    private String itemName;
    private com.taprobanastudios.main.model.enums.UnitOfMeasure unitOfMeasure;
    private BigDecimal currentStock;
    private com.taprobanastudios.main.model.enums.StockStatus status;
    private java.time.LocalDateTime updatedAt;
    private boolean isDefaultMaterial;
}
