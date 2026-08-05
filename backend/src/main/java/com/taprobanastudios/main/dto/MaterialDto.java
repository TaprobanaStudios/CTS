package com.taprobanastudios.main.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class MaterialDto {
    private UUID id;
    private String name;
    private String unitOfMeasure;
}
