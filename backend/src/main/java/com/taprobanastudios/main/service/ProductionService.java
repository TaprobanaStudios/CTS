package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.DailyProductionReportDto;

import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import com.taprobanastudios.main.dto.ProductionFilterDto;
import com.taprobanastudios.main.dto.ProductionItemUpdateDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ProductionService {
    DailyProductionReportDto saveProductionReport(DailyProductionReportDto reportDto);
    List<ProductionItemResponseDto> getAllProductionItems();
    // Corrects the date, quantity or damages of one production entry and records who did it
    ProductionItemResponseDto updateProductionItem(java.util.UUID itemId, ProductionItemUpdateDto updateDto);
    Page<ProductionItemResponseDto> getProductionItems(ProductionFilterDto filter, Pageable pageable);
}
