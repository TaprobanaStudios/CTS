package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ProductionItemResponseDto {
    private UUID id;
    private LocalDate reportDate;
    private String workerName;
    private String productType;
    private Integer qtyProduced;
    private java.util.List<MaterialUsageDto> materials;
    private Integer damages;
}
