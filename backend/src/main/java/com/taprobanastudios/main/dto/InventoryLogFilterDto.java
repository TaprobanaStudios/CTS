package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.StockMovement;
import lombok.Data;

@Data
public class InventoryLogFilterDto {
    private String search;
    private StockMovement movement;
}
