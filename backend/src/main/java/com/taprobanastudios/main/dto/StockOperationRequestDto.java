package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class StockOperationRequestDto {
    private UUID materialId;
    private String materialName;
    private BigDecimal amount;
    private String authorizedBy;
    private String remarks;
}
