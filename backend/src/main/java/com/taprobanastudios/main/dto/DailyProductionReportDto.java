package com.taprobanastudios.main.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class DailyProductionReportDto {
    private UUID id;
    private LocalDate reportDate;
    private String workerName;
    private List<ProductionItemDto> productionItems;
}
