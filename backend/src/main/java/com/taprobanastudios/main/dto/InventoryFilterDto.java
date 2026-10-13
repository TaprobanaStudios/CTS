package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.StockStatus;
import lombok.Data;

@Data
public class InventoryFilterDto {
    private String search;
    private StockStatus status;
}
