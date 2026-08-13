package com.taprobanastudios.main.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductUsageDto {
    private String productName;
    private Integer amount;
}
