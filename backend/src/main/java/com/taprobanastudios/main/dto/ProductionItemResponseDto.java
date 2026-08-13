package com.taprobanastudios.main.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.taprobanastudios.main.model.enums.ProductionStatus;

@Data
public class ProductionItemResponseDto {
    private UUID id;
    private LocalDate reportDate;
    private String workerName;
    private String productType;
    private Integer qtyProduced;
    private ProductionStatus status;
    private java.util.List<MaterialUsageDto> materials;
    private java.util.List<ProductUsageDto> productUsages;
    private Integer damages;
}
