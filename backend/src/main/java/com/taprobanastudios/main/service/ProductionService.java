package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.DailyProductionReportDto;

import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import java.util.List;

public interface ProductionService {
    DailyProductionReportDto saveProductionReport(DailyProductionReportDto reportDto);
    List<ProductionItemResponseDto> getAllProductionItems();
}
