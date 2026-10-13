package com.taprobanastudios.main.dto;

import lombok.Data;

import java.math.BigDecimal;

// Where a manufactured product's stock stands: produced - damaged - used in other products - sold
@Data
public class ProductStockDto {
    private String productName;
    private long produced;
    private long damages;
    private long used;
    private long sold;
    private long currentStock;
    // Average material cost per usable piece, from productions whose materials had a cost; null if none
    private BigDecimal unitMaterialCost;
}
