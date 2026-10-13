package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.ProductBinSummaryDto;
import com.taprobanastudios.main.dto.ProductSaleDto;
import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import com.taprobanastudios.main.dto.ProductionLedgerRowDto;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.repository.ProductionBinRepository;
import com.taprobanastudios.main.service.ProductionBinService;
import com.taprobanastudios.main.service.ProductionService;
import com.taprobanastudios.main.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductionBinServiceImpl implements ProductionBinService {

    private static final String PRODUCTION = "PRODUCTION";
    private static final String SALE = "SALE";
    private static final Set<String> MOVEMENTS = Set.of("all", "in", "out", "damage");

    private final ProductionBinRepository binRepository;
    private final ProductionService productionService;
    private final SalesService salesService;

    @Override
    @Transactional(readOnly = true)
    public Page<ProductBinSummaryDto> getProducts(String search, Pageable pageable) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        List<ProductBinSummaryDto> products = binRepository
                .findProductTotals(search, monthStart, monthStart.plusMonths(1), pageable.getPageSize(), pageable.getOffset())
                .stream()
                // Columns: key, name, then the eight totals
                .map(row -> toSummary((String) row[1], row, 2))
                .collect(Collectors.toList());
        return new PageImpl<>(products, pageable, binRepository.countProducts(search));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductBinSummaryDto getSummary(String productName) {
        String key = key(productName);
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1);

        Object[] totals = binRepository.findTotals(key, monthStart, monthEnd);
        // Columns: name, then the eight totals. One product keeps its name; all products together have none.
        ProductBinSummaryDto summary = toSummary(key.isEmpty() ? null : (String) totals[0], totals, 1);

        Object[] cost = binRepository.findMaterialCost(key, monthStart, monthEnd);
        boolean anyCost = Boolean.TRUE.equals(cost[1]);
        summary.getThisMonth().setMaterialCost(anyCost ? (BigDecimal) cost[0] : null);
        summary.getThisMonth().setMaterialCostPartial(Boolean.TRUE.equals(cost[2]));
        return summary;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductionLedgerRowDto> getLedger(String productName, String movement, String search,
                                                  boolean newestFirst, Pageable pageable, boolean includePrices) {
        String movementFilter = movement == null || movement.isBlank() ? "all" : movement.trim().toLowerCase();
        if (!MOVEMENTS.contains(movementFilter)) {
            throw new BadRequestException("Unknown movement filter: " + movement);
        }
        Map<String, String> filter = Map.of(
                "product", key(productName),
                "movement", movementFilter,
                "search", search == null ? "" : search.trim());

        List<ProductionLedgerRowDto> rows = binRepository
                .findLedger(filter, newestFirst, pageable.getPageSize(), pageable.getOffset())
                .stream().map(this::toRow).collect(Collectors.toList());
        addDetails(rows, includePrices);
        return new PageImpl<>(rows, pageable, binRepository.countLedger(filter));
    }

    // Columns: type, source id, index, name, date, in, out, damage, closing, worker, used for, seq
    private ProductionLedgerRowDto toRow(Object[] row) {
        ProductionLedgerRowDto dto = new ProductionLedgerRowDto();
        String type = (String) row[0];
        UUID sourceId = UUID.fromString((String) row[1]);
        long index = number(row[2]);
        dto.setType(type);
        dto.setProductName((String) row[3]);
        dto.setDate(row[4] instanceof java.sql.Date date ? date.toLocalDate() : (LocalDate) row[4]);
        dto.setQtyIn(number(row[5]));
        dto.setQtyOut(number(row[6]));
        dto.setDamage(number(row[7]));
        dto.setClosingStock(number(row[8]));
        dto.setOpeningStock(dto.getClosingStock() - dto.getQtyIn() + dto.getQtyOut() + dto.getDamage());
        dto.setWorkerName((String) row[9]);
        dto.setUsedFor((String) row[10]);
        dto.setSeq(number(row[11]));

        switch (type) {
            case PRODUCTION -> {
                dto.setId("prod-" + sourceId);
                dto.setSourceId(sourceId);
            }
            case SALE -> {
                dto.setId("sale-" + sourceId);
                dto.setSourceId(sourceId);
            }
            // A "used in" row belongs to another product's production entry and is corrected there
            default -> dto.setId("cons-" + sourceId + "-" + index);
        }
        return dto;
    }

    // Fills in what only the page on screen needs: materials and edit notes of productions, prices of sales
    private void addDetails(List<ProductionLedgerRowDto> rows, boolean includePrices) {
        Map<UUID, ProductionItemResponseDto> productions = productionService.getProductionItemsByIds(sourceIds(rows, PRODUCTION))
                .stream().collect(Collectors.toMap(ProductionItemResponseDto::getId, Function.identity()));
        Map<UUID, ProductSaleDto> sales = salesService.getSalesByIds(sourceIds(rows, SALE))
                .stream().collect(Collectors.toMap(ProductSaleDto::getId, Function.identity()));

        for (ProductionLedgerRowDto row : rows) {
            if (PRODUCTION.equals(row.getType()) && productions.containsKey(row.getSourceId())) {
                ProductionItemResponseDto production = productions.get(row.getSourceId());
                row.setStatus(production.getStatus());
                row.setMaterials(production.getMaterials());
                row.setProductUsages(production.getProductUsages());
                row.setEditedBy(production.getEditedBy());
                row.setEditedAt(production.getEditedAt());
                row.setEditCount(production.getEditCount());
                row.setEditNote(production.getEditNote());
            } else if (SALE.equals(row.getType()) && sales.containsKey(row.getSourceId())) {
                ProductSaleDto sale = sales.get(row.getSourceId());
                row.setUnitPrice(includePrices ? sale.getUnitPrice() : null);
                row.setEditedBy(sale.getEditedBy());
                row.setEditedAt(sale.getEditedAt());
                row.setEditCount(sale.getEditCount());
                row.setEditNote(sale.getEditNote());
            }
        }
    }

    private List<UUID> sourceIds(List<ProductionLedgerRowDto> rows, String type) {
        return rows.stream().filter(row -> type.equals(row.getType())).map(ProductionLedgerRowDto::getSourceId)
                .collect(Collectors.toList());
    }

    // "from" is the column where the eight totals start: four all-time, then four for this month
    private ProductBinSummaryDto toSummary(String name, Object[] row, int from) {
        ProductBinSummaryDto dto = new ProductBinSummaryDto();
        dto.setProductName(name);
        dto.setProduced(number(row[from]));
        dto.setDamages(number(row[from + 1]));
        dto.setUsed(number(row[from + 2]));
        dto.setSold(number(row[from + 3]));
        dto.setCurrentStock(Math.max(0, dto.getProduced() - dto.getDamages() - dto.getUsed() - dto.getSold()));

        ProductBinSummaryDto.MonthTotals month = new ProductBinSummaryDto.MonthTotals();
        month.setProduced(number(row[from + 4]));
        month.setDamages(number(row[from + 5]));
        month.setUsed(number(row[from + 6]));
        month.setSold(number(row[from + 7]));
        dto.setThisMonth(month);
        return dto;
    }

    private long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    // Products are matched by name, ignoring case and surrounding spaces
    private String key(String productName) {
        return productName == null ? "" : productName.trim().toLowerCase();
    }
}
