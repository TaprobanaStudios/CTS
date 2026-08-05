package com.taprobanastudios.main.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ItemDto {
    private UUID id;
    private String name;
    private com.taprobanastudios.main.model.enums.UnitOfMeasure unitOfMeasure;
    private boolean isDefaultMaterial;
}
