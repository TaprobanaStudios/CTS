package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MaterialUsageDto {
    private UUID itemId;
    private String itemName;
    private BigDecimal amount;
}
