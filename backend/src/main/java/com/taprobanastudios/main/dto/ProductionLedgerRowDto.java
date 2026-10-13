package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.ProductionStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// One line of a product's ledger, with the balance before and after it
@Data
public class ProductionLedgerRowDto {
    private String id;
    // Position in chronological order; dates alone cannot order two entries of the same day
    private long seq;
    // PRODUCTION (made), CONSUMPTION (used to make another product) or SALE
    private String type;
    private LocalDate date;
    private String productName;
    private long openingStock;
    private long qtyIn;
    private long qtyOut;
    private long damage;
    private long closingStock;
    // The production entry or sale behind the row, for editing it; absent on CONSUMPTION rows
    private UUID sourceId;
    private String workerName;
    // CONSUMPTION only: the product this one went into
    private String usedFor;

    // PRODUCTION only
    private ProductionStatus status;
    private List<MaterialUsageDto> materials;
    private List<ProductUsageDto> productUsages;

    // SALE only: selling price per piece; left out for clerks
    private BigDecimal unitPrice;

    private String editedBy;
    private LocalDateTime editedAt;
    private Integer editCount;
    private String editNote;
}
