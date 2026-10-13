package com.taprobanastudios.main.dto;

import lombok.Data;

import java.time.LocalDate;

// A correction to one production entry
@Data
public class ProductionItemUpdateDto {
    private LocalDate reportDate;
    private Integer qtyProduced;
    private Integer damages;
    private String editedBy;
    // Why the entry is being corrected (optional)
    private String editRemark;
}
