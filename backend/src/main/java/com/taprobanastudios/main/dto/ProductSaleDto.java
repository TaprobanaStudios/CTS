package com.taprobanastudios.main.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ProductSaleDto {
    private UUID id;
    private LocalDate saleDate;
    private String productName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal unitMaterialCost;
    private String editedBy;
    private java.time.LocalDateTime editedAt;
    private Integer editCount;
    private String editNote;
    // Sent with an edit: why the sale is being corrected (optional)
    private String editRemark;
}
