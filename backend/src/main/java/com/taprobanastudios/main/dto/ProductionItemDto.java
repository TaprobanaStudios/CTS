package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ProductionItemDto {
    private UUID id;
    private String productType;
    private Integer qtyProduced;
    private BigDecimal cementUsed;
    private BigDecimal qdUsed;
    private BigDecimal rsUsed;
    private BigDecimal halfMUsed;
    private BigDecimal threeQuarterMUsed;
    private Integer damages;
}
