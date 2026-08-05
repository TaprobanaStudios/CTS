package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.DailyProductionReportDto;
import com.taprobanastudios.main.dto.ProductionItemDto;
import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.model.DailyProductionReport;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.repository.DailyProductionReportRepository;
import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.service.ProductionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductionServiceImpl implements ProductionService {

    private final DailyProductionReportRepository reportRepository;
    private final InventoryService inventoryService;

    @Override
    @Transactional
    public DailyProductionReportDto saveProductionReport(DailyProductionReportDto reportDto) {
        log.info("Saving daily production report for date: {}", reportDto.getReportDate());
        
        DailyProductionReport report = new DailyProductionReport();
        report.setReportDate(reportDto.getReportDate());
        report.setWorkerName(reportDto.getWorkerName());

        if (reportDto.getProductionItems() != null) {
            List<ProductionItem> items = reportDto.getProductionItems().stream().map(dto -> {
                ProductionItem item = new ProductionItem();
                item.setDailyProductionReport(report);
                item.setProductType(dto.getProductType());
                item.setQtyProduced(dto.getQtyProduced());
                item.setCementUsed(dto.getCementUsed());
                item.setQdUsed(dto.getQdUsed());
                item.setRsUsed(dto.getRsUsed());
                item.setHalfMUsed(dto.getHalfMUsed());
                item.setThreeQuarterMUsed(dto.getThreeQuarterMUsed());
                item.setDamages(dto.getDamages());
                return item;
            }).collect(Collectors.toList());
            report.setProductionItems(items);
        }

        // 1. Save the production report and its items
        DailyProductionReport savedReport = reportRepository.save(report);
        log.info("Production report saved successfully with ID: {}", savedReport.getId());

        // 2. Automatically deduct materials used from inventory
        if (savedReport.getProductionItems() != null) {
            log.info("Starting automatic material deduction from inventory");
            for (ProductionItem item : savedReport.getProductionItems()) {
                deductIfUsed("Cement", item.getCementUsed(), report.getWorkerName());
                deductIfUsed("Quarry Dust", item.getQdUsed(), report.getWorkerName());
                deductIfUsed("River Sand", item.getRsUsed(), report.getWorkerName());
                deductIfUsed("1/2 Metal", item.getHalfMUsed(), report.getWorkerName());
                deductIfUsed("3/4 Metal", item.getThreeQuarterMUsed(), report.getWorkerName());
            }
            log.info("Completed automatic material deduction");
        }
        
        reportDto.setId(savedReport.getId());
        return reportDto;
    }

    private void deductIfUsed(String materialName, BigDecimal amount, String workerName) {
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            String remarks = "Auto-deducted from Daily Production";
            StockOperationRequestDto requestDto = new StockOperationRequestDto();
            requestDto.setMaterialName(materialName);
            requestDto.setAmount(amount);
            requestDto.setAuthorizedBy(workerName);
            requestDto.setRemarks(remarks);
            
            inventoryService.deductStock(requestDto);
        }
    }
}
