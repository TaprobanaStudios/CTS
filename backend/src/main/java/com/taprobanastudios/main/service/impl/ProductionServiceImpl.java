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

import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import com.taprobanastudios.main.repository.ProductionItemRepository;

import com.taprobanastudios.main.model.ProductionMaterialUsage;
import com.taprobanastudios.main.repository.ItemRepository;
import com.taprobanastudios.main.model.Item;
import com.taprobanastudios.main.dto.MaterialUsageDto;
import jakarta.persistence.EntityNotFoundException;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductionServiceImpl implements ProductionService {

    private final DailyProductionReportRepository reportRepository;
    private final ProductionItemRepository productionItemRepository;
    private final InventoryService inventoryService;
    private final ItemRepository itemRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProductionItemResponseDto> getAllProductionItems() {
        return productionItemRepository.findAllByOrderByCreatedAtDesc().stream().map(item -> {
            ProductionItemResponseDto dto = new ProductionItemResponseDto();
            dto.setId(item.getId());
            dto.setReportDate(item.getDailyProductionReport().getReportDate());
            dto.setWorkerName(item.getDailyProductionReport().getWorkerName());
            dto.setProductType(item.getProductType());
            dto.setQtyProduced(item.getQtyProduced());
            dto.setDamages(item.getDamages());

            if (item.getMaterialUsages() != null) {
                dto.setMaterials(item.getMaterialUsages().stream().map(usage -> {
                    MaterialUsageDto usageDto = new MaterialUsageDto();
                    usageDto.setItemId(usage.getItem().getId());
                    usageDto.setItemName(usage.getItem().getName());
                    usageDto.setAmount(usage.getAmount());
                    return usageDto;
                }).collect(Collectors.toList()));
            }

            return dto;
        }).collect(Collectors.toList());
    }

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
                item.setDamages(dto.getDamages());

                if (dto.getMaterials() != null) {
                    List<ProductionMaterialUsage> usages = dto.getMaterials().stream().map(mDto -> {
                        ProductionMaterialUsage usage = new ProductionMaterialUsage();
                        usage.setProductionItem(item);
                        Item invItem = itemRepository.findById(mDto.getItemId())
                            .orElseThrow(() -> new EntityNotFoundException("Item not found: " + mDto.getItemId()));
                        usage.setItem(invItem);
                        usage.setAmount(mDto.getAmount());
                        return usage;
                    }).collect(Collectors.toList());
                    item.setMaterialUsages(usages);
                }

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
                if (item.getMaterialUsages() != null) {
                    for (ProductionMaterialUsage usage : item.getMaterialUsages()) {
                        deductIfUsed(usage.getItem().getName(), usage.getAmount(), report.getWorkerName());
                    }
                }
            }
            log.info("Completed automatic material deduction");
        }
        
        reportDto.setId(savedReport.getId());
        return reportDto;
    }

    private void deductIfUsed(String itemName, BigDecimal amount, String workerName) {
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            String remarks = "Auto-deducted from Daily Production";
            StockOperationRequestDto requestDto = new StockOperationRequestDto();
            requestDto.setItemName(itemName);
            requestDto.setAmount(amount);
            requestDto.setAuthorizedBy(workerName);
            requestDto.setRemarks(remarks);
            
            inventoryService.deductStock(requestDto);
        }
    }
}
