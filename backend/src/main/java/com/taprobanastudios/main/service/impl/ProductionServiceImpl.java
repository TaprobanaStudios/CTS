package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.DailyProductionReportDto;
import com.taprobanastudios.main.dto.InventoryLogDto;
import com.taprobanastudios.main.dto.ProductionFilterDto;
import com.taprobanastudios.main.dto.ProductionItemUpdateDto;
import com.taprobanastudios.main.dto.ProductStockDto;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.service.SalesService;
import com.taprobanastudios.main.service.EditHistoryService;
import java.time.LocalDateTime;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.repository.InventoryLogRepository;
import com.taprobanastudios.main.repository.ProductionItemSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import com.taprobanastudios.main.repository.ProductionItemRepository;

import com.taprobanastudios.main.model.ProductionMaterialUsage;
import com.taprobanastudios.main.repository.ItemRepository;
import com.taprobanastudios.main.model.Item;
import com.taprobanastudios.main.dto.MaterialUsageDto;
import jakarta.persistence.EntityNotFoundException;

import com.taprobanastudios.main.model.enums.ProductionStatus;

import com.taprobanastudios.main.dto.ProductUsageDto;
import com.taprobanastudios.main.model.ProductionProductUsage;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductionServiceImpl implements ProductionService {

    private final DailyProductionReportRepository reportRepository;
    private final ProductionItemRepository productionItemRepository;
    private final InventoryService inventoryService;
    private final ItemRepository itemRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final SalesService salesService;
    private final EditHistoryService editHistoryService;

    // Sortable columns of the production log, mapped to the entity path they sort on
    private static final Map<String, String> SORT_PROPERTIES = Map.of(
            "reportDate", "dailyProductionReport.reportDate",
            "productType", "productType",
            "qtyProduced", "qtyProduced",
            "damages", "damages");

    @Override
    @Transactional(readOnly = true)
    public List<ProductionItemResponseDto> getAllProductionItems() {
        return productionItemRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductionItemResponseDto> getProductionItems(ProductionFilterDto filter, Pageable pageable) {
        log.info("Fetching production items with filter: {} and pageable: {}", filter, pageable);
        // Latest report first unless the caller asks for another order; newest entry breaks ties
        Sort sort = Sort.by(Sort.Direction.DESC, SORT_PROPERTIES.get("reportDate"));
        for (Sort.Order order : pageable.getSort()) {
            String property = SORT_PROPERTIES.get(order.getProperty());
            if (property == null) {
                throw new BadRequestException("Cannot sort production items by: " + order.getProperty());
            }
            sort = Sort.by(order.getDirection(), property);
        }
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                sort.and(Sort.by(Sort.Direction.DESC, "createdAt")));
        return productionItemRepository.findAll(ProductionItemSpecifications.matching(filter), sorted)
                .map(this::mapToResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductionItemResponseDto> getProductionItemsByIds(java.util.Collection<UUID> itemIds) {
        return productionItemRepository.findAllById(itemIds).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductionItemResponseDto updateProductionItem(UUID itemId, ProductionItemUpdateDto updateDto) {
        ProductionItem item = productionItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Production entry not found for ID: " + itemId));
        log.info("Updating production entry {} of {}", itemId, item.getProductType());

        if (updateDto.getEditedBy() == null || updateDto.getEditedBy().isBlank()) {
            throw new BadRequestException("Edited By is required");
        }
        if (updateDto.getQtyProduced() == null || updateDto.getQtyProduced() < 1) {
            throw new BadRequestException("Must produce at least 1 unit");
        }
        int damages = updateDto.getDamages() != null ? updateDto.getDamages() : 0;
        if (damages < 0 || damages > updateDto.getQtyProduced()) {
            throw new BadRequestException("Damages must be between 0 and the quantity produced");
        }

        ChangeList changes = new ChangeList();
        changes.compare("Qty produced (PCS)", item.getQtyProduced(), updateDto.getQtyProduced());
        changes.compare("Damages (PCS)", item.getDamages() != null ? item.getDamages() : 0, damages);
        changes.compare("Report date", item.getDailyProductionReport().getReportDate(),
                updateDto.getReportDate() != null ? updateDto.getReportDate() : item.getDailyProductionReport().getReportDate());
        if (changes.isEmpty()) {
            return mapToResponseDto(item);
        }

        // Pieces already used or sold cannot be taken back out of the count
        long oldUsable = (item.getQtyProduced() != null ? item.getQtyProduced() : 0)
                - (item.getDamages() != null ? item.getDamages() : 0);
        long newUsable = updateDto.getQtyProduced() - damages;
        long inStock = salesService.getProductStocks().stream()
                .filter(stock -> stock.getProductName().equalsIgnoreCase(item.getProductType().trim()))
                .mapToLong(ProductStockDto::getCurrentStock)
                .findFirst().orElse(0);
        if (inStock + newUsable - oldUsable < 0) {
            throw new BadRequestException("Only " + inStock + " PCS of " + item.getProductType()
                    + " are left in inventory; the rest of this production has already been sold or used in other "
                    + "products. The usable quantity can drop by at most " + inStock + " PCS. Going lower would make "
                    + "the product stock negative and affect sales, balances and reports across the whole system.");
        }

        item.setQtyProduced(updateDto.getQtyProduced());
        item.setDamages(damages);
        if (updateDto.getReportDate() != null) {
            item.getDailyProductionReport().setReportDate(updateDto.getReportDate());
        }
        item.setEditedBy(updateDto.getEditedBy().trim());
        item.setEditedAt(LocalDateTime.now());
        item.setEditCount((item.getEditCount() != null ? item.getEditCount() : 0) + 1);
        item.setEditNote(editHistoryService.record("PRODUCTION", item.getId(), item.getProductType(),
                item.getEditedBy(), item.getEditedAt(), changes.lines(), updateDto.getEditRemark()));
        return mapToResponseDto(productionItemRepository.save(item));
    }

    private ProductionItemResponseDto mapToResponseDto(ProductionItem item) {
        ProductionItemResponseDto dto = new ProductionItemResponseDto();
        dto.setId(item.getId());
        dto.setReportDate(item.getDailyProductionReport().getReportDate());
        dto.setWorkerName(item.getDailyProductionReport().getWorkerName());
        dto.setProductType(item.getProductType());
        dto.setQtyProduced(item.getQtyProduced());
        dto.setStatus(item.getStatus() != null ? item.getStatus() : ProductionStatus.STORED);
        dto.setDamages(item.getDamages());
        dto.setEditedBy(item.getEditedBy());
        dto.setEditedAt(item.getEditedAt());
        dto.setEditCount(item.getEditCount());
        dto.setEditNote(item.getEditNote());

        if (item.getMaterialUsages() != null) {
            dto.setMaterials(item.getMaterialUsages().stream().map(usage -> {
                MaterialUsageDto usageDto = new MaterialUsageDto();
                usageDto.setItemId(usage.getItem().getId());
                usageDto.setItemName(usage.getItem().getName());
                usageDto.setUnitOfMeasure(usage.getItem().getUnitOfMeasure());
                usageDto.setAmount(usage.getAmount());
                usageDto.setUnitCost(usage.getUnitCost());
                if (usage.getBatch() != null) {
                    usageDto.setBatchId(usage.getBatch().getId());
                    usageDto.setBatchCode(usage.getBatch().getBatchCode());
                }
                return usageDto;
            }).collect(Collectors.toList()));
        }

        if (item.getProductUsages() != null) {
            dto.setProductUsages(item.getProductUsages().stream().map(pu -> {
                ProductUsageDto puDto = new ProductUsageDto();
                puDto.setProductName(pu.getProductName());
                puDto.setAmount(pu.getAmount());
                return puDto;
            }).collect(Collectors.toList()));
        }

        return dto;
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
                item.setStatus(dto.getStatus() != null ? dto.getStatus() : ProductionStatus.STORED);
                item.setDamages(dto.getDamages());

                if (dto.getMaterials() != null) {
                    List<ProductionMaterialUsage> usages = dto.getMaterials().stream().map(mDto -> {
                        ProductionMaterialUsage usage = new ProductionMaterialUsage();
                        usage.setProductionItem(item);
                        Item invItem = itemRepository.findById(mDto.getItemId())
                            .orElseThrow(() -> new EntityNotFoundException("Item not found: " + mDto.getItemId()));
                        usage.setItem(invItem);
                        usage.setAmount(mDto.getAmount());
                        deductUsedMaterial(usage, mDto.getBatchId(), mDto.getUnitCost(), report.getWorkerName());
                        return usage;
                    }).collect(Collectors.toList());
                    item.setMaterialUsages(usages);
                }

                if (dto.getProductUsages() != null) {
                    List<ProductionProductUsage> pUsages = dto.getProductUsages().stream().map(puDto -> {
                        ProductionProductUsage pu = new ProductionProductUsage();
                        pu.setProductionItem(item);
                        pu.setProductName(puDto.getProductName());
                        pu.setAmount(puDto.getAmount());
                        return pu;
                    }).collect(Collectors.toList());
                    item.setProductUsages(pUsages);
                }

                return item;
            }).collect(Collectors.toList());
            report.setProductionItems(items);
        }

        DailyProductionReport savedReport = reportRepository.save(report);
        log.info("Production report saved successfully with ID: {}", savedReport.getId());

        reportDto.setId(savedReport.getId());
        return reportDto;
    }

    // Deducts the material from inventory and records which stock it came from and what it cost
    // fallbackUnitCost is used for stocks that were loaded without a buying cost
    private void deductUsedMaterial(ProductionMaterialUsage usage, UUID batchId, BigDecimal fallbackUnitCost,
                                    String workerName) {
        BigDecimal amount = usage.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Quantity used is required for " + usage.getItem().getName());
        }

        StockOperationRequestDto requestDto = new StockOperationRequestDto();
        requestDto.setItemId(usage.getItem().getId());
        requestDto.setItemName(usage.getItem().getName());
        requestDto.setAmount(amount);
        requestDto.setBatchId(batchId);
        requestDto.setUnitCost(fallbackUnitCost);
        requestDto.setAuthorizedBy(workerName != null && !workerName.trim().isEmpty() ? workerName : "Daily Production");
        requestDto.setRemarks(InventoryServiceImpl.PRODUCTION_DEDUCTION_REMARK);

        List<InventoryLogDto> deductions = inventoryService.deductStock(requestDto);

        if (deductions.size() == 1 && deductions.get(0).getBatchId() != null) {
            usage.setBatch(inventoryLogRepository.getReferenceById(deductions.get(0).getBatchId()));
        }
        // A production entry is always costed: each stock used has its own price or the one given now
        if (deductions.stream().anyMatch(deduction -> deduction.getUnitCost() == null)) {
            throw new BadRequestException("Unit cost is required for " + usage.getItem().getName()
                    + ": the stock it is taken from has no buying cost recorded");
        }
        BigDecimal totalCost = deductions.stream()
                .map(deduction -> deduction.getUnitCost().multiply(deduction.getQtyOut()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        usage.setUnitCost(totalCost.divide(amount, 2, RoundingMode.HALF_UP));
    }
}
