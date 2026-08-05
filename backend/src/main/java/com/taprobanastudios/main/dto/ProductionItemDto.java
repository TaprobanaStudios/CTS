package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ProductionItemDto {
    private UUID id;
    private String productType;
    private Integer qtyProduced;
    private java.util.List<MaterialUsageDto> materials;
    private Integer damages;
}
