package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.ProductionStatus;
import lombok.Data;

@Data
public class ProductionFilterDto {
    private String search;
    private ProductionStatus status;
}
