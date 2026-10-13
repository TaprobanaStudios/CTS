package com.taprobanastudios.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventorySummaryDto {
    private long total;
    private long healthy;
    private long low;
    private long depleted;
}
