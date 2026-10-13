package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.DashboardSummaryDto;
import com.taprobanastudios.main.dto.DashboardSummaryDto.ActivityDto;
import com.taprobanastudios.main.dto.DashboardSummaryDto.ProductSummaryDto;
import com.taprobanastudios.main.dto.DashboardSummaryDto.StockAlertDto;
import com.taprobanastudios.main.dto.DashboardSummaryDto.TrendPointDto;
import com.taprobanastudios.main.dto.InventoryLogFilterDto;
import com.taprobanastudios.main.dto.ProductStockDto;
import com.taprobanastudios.main.model.InventoryLog;
import com.taprobanastudios.main.model.ProductSale;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.model.ProductionMaterialUsage;
import com.taprobanastudios.main.model.enums.StockMovement;
import com.taprobanastudios.main.model.enums.StockStatus;
import com.taprobanastudios.main.repository.InventoryLogRepository;
import com.taprobanastudios.main.repository.InventoryLogSpecifications;
import com.taprobanastudios.main.repository.ProductSaleRepository;
import com.taprobanastudios.main.repository.ProductionItemRepository;
import com.taprobanastudios.main.repository.WorkerRepository;
import com.taprobanastudios.main.service.DashboardService;
import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final int STOCK_ALERT_LIMIT = 6;
    private static final int ACTIVITY_LIMIT = 10;

    private final WorkerRepository workerRepository;
    private final ProductionItemRepository productionItemRepository;
    private final ProductSaleRepository productSaleRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final InventoryService inventoryService;
    private final SalesService salesService;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryDto getDashboardSummary(String period) {
        LocalDate today = LocalDate.now();
        String normalizedPeriod = period != null ? period.toLowerCase() : "month";
        LocalDate startDate = switch (normalizedPeriod) {
            case "today" -> today;
            case "week" -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case "quarter" -> today.withMonth(((today.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1);
            case "year" -> today.withDayOfYear(1);
            default -> today.withDayOfMonth(1);
        };
        List<TrendPointDto> trend = emptyTrend(normalizedPeriod, startDate, today);

        // ---- production in the period
        long totalProduced = 0;
        long totalDamages = 0;
        BigDecimal materialCost = BigDecimal.ZERO;
        boolean materialCostPartial = false;
        List<LocalDate> productionDays = new ArrayList<>();
        Map<String, long[]> periodByProduct = new HashMap<>(); // name -> {produced, sold}

        List<ProductionItem> productionItems = productionItemRepository.findAllByOrderByCreatedAtDesc();
        for (ProductionItem item : productionItems) {
            LocalDate date = item.getDailyProductionReport().getReportDate();
            if (date.isBefore(startDate) || date.isAfter(today)) {
                continue;
            }
            long produced = item.getQtyProduced() != null ? item.getQtyProduced() : 0;
            long damages = item.getDamages() != null ? item.getDamages() : 0;
            totalProduced += produced;
            totalDamages += damages;
            if (!productionDays.contains(date)) {
                productionDays.add(date);
            }
            for (ProductionMaterialUsage usage : item.getMaterialUsages()) {
                if (usage.getUnitCost() != null) {
                    materialCost = materialCost.add(usage.getUnitCost().multiply(usage.getAmount()));
                } else {
                    materialCostPartial = true;
                }
            }
            periodByProduct.computeIfAbsent(item.getProductType().trim().toLowerCase(), k -> new long[2])[0] += produced;

            TrendPointDto point = trend.get(bucketIndex(normalizedPeriod, date, startDate));
            point.setProduced(point.getProduced() + produced);
            point.setDamaged(point.getDamaged() + damages);
        }

        // ---- sales in the period
        long unitsSold = 0;
        BigDecimal salesRevenue = BigDecimal.ZERO;
        BigDecimal salesProfit = null;
        boolean salesProfitPartial = false;

        List<ProductSale> sales = productSaleRepository.findAllByOrderByCreatedAtDesc();
        for (ProductSale sale : sales) {
            LocalDate date = sale.getSaleDate();
            if (date.isBefore(startDate) || date.isAfter(today)) {
                continue;
            }
            BigDecimal quantity = BigDecimal.valueOf(sale.getQuantity());
            BigDecimal revenue = sale.getUnitPrice().multiply(quantity);
            unitsSold += sale.getQuantity();
            salesRevenue = salesRevenue.add(revenue);
            if (sale.getUnitMaterialCost() != null) {
                BigDecimal profit = revenue.subtract(sale.getUnitMaterialCost().multiply(quantity));
                salesProfit = salesProfit == null ? profit : salesProfit.add(profit);
            } else {
                salesProfitPartial = true;
            }
            periodByProduct.computeIfAbsent(sale.getProductName().trim().toLowerCase(), k -> new long[2])[1] += sale.getQuantity();

            TrendPointDto point = trend.get(bucketIndex(normalizedPeriod, date, startDate));
            point.setSold(point.getSold() + sale.getQuantity());
            point.setRevenue(point.getRevenue().add(revenue));
        }

        // ---- current state
        List<CurrentInventoryDto> inventory = inventoryService.getCurrentInventory();
        List<StockAlertDto> stockAlerts = inventory.stream()
                .filter(item -> item.getStatus() != StockStatus.HEALTHY)
                // Running low comes before already out: those can still be acted on in time
                .sorted(Comparator.comparing((CurrentInventoryDto item) -> item.getStatus() == StockStatus.LOW ? 0 : 1)
                        .thenComparing(CurrentInventoryDto::getItemName, String.CASE_INSENSITIVE_ORDER))
                .limit(STOCK_ALERT_LIMIT)
                .map(item -> StockAlertDto.builder()
                        .itemName(item.getItemName())
                        .currentStock(item.getCurrentStock().doubleValue())
                        .unitOfMeasure(item.getUnitOfMeasure() != null ? item.getUnitOfMeasure().name() : "")
                        .status(item.getStatus())
                        .build())
                .toList();

        List<ProductSummaryDto> products = salesService.getProductStocks().stream()
                .sorted(Comparator.comparingLong(ProductStockDto::getCurrentStock).reversed())
                .map(stock -> {
                    long[] inPeriod = periodByProduct.getOrDefault(stock.getProductName().toLowerCase(), new long[2]);
                    return ProductSummaryDto.builder()
                            .productName(stock.getProductName())
                            .currentStock(stock.getCurrentStock())
                            .producedInPeriod(inPeriod[0])
                            .soldInPeriod(inPeriod[1])
                            .build();
                })
                .toList();

        return DashboardSummaryDto.builder()
                .period(normalizedPeriod)
                .startDate(startDate)
                .endDate(today)
                .activeWorkers(workerRepository.countByStatus("ACTIVE"))
                .totalProduced(totalProduced)
                .totalDamages(totalDamages)
                .damageRate(totalProduced > 0 ? (double) totalDamages / totalProduced * 100.0 : 0)
                .avgDailyProduction(productionDays.isEmpty() ? 0 : totalProduced / productionDays.size())
                .materialCost(materialCost)
                .materialCostPartial(materialCostPartial)
                .unitsSold(unitsSold)
                .salesRevenue(salesRevenue)
                .salesProfit(salesProfit)
                .salesProfitPartial(salesProfit != null && salesProfitPartial)
                .inventory(inventoryService.getInventorySummary())
                .stockAlerts(stockAlerts)
                .products(products)
                .trend(trend)
                .recentActivity(recentActivity(productionItems, sales))
                .build();
    }

    // One zeroed point per bar of the chart, so quiet stretches still show:
    // today = 1 bar, week = 7 days, month = its weeks (1-7, 8-14, ...), quarter and year = months
    private List<TrendPointDto> emptyTrend(String period, LocalDate startDate, LocalDate today) {
        List<String> labels = new ArrayList<>();
        switch (period) {
            case "today" -> labels.add("Today");
            case "week" -> {
                for (int day = 0; day < 7; day++) {
                    labels.add(startDate.plusDays(day).getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
                }
            }
            case "quarter", "year" -> {
                for (LocalDate month = startDate; !month.isAfter(today); month = month.plusMonths(1)) {
                    labels.add(month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
                }
            }
            default -> {
                String month = startDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                int daysInMonth = startDate.lengthOfMonth();
                for (int firstDay = 1; firstDay <= daysInMonth; firstDay += 7) {
                    labels.add(month + " " + firstDay + "–" + Math.min(firstDay + 6, daysInMonth));
                }
            }
        }
        List<TrendPointDto> trend = new ArrayList<>();
        for (String label : labels) {
            trend.add(TrendPointDto.builder().label(label).revenue(BigDecimal.ZERO).build());
        }
        return trend;
    }

    private int bucketIndex(String period, LocalDate date, LocalDate startDate) {
        return switch (period) {
            case "today", "week" -> (int) ChronoUnit.DAYS.between(startDate, date);
            case "quarter", "year" -> (int) ChronoUnit.MONTHS.between(startDate.withDayOfMonth(1), date.withDayOfMonth(1));
            default -> (date.getDayOfMonth() - 1) / 7;
        };
    }

    // The latest productions, sales and stock loads, newest first
    private List<ActivityDto> recentActivity(List<ProductionItem> productionItems, List<ProductSale> sales) {
        List<ActivityDto> activity = new ArrayList<>();

        productionItems.stream().limit(ACTIVITY_LIMIT).forEach(item -> {
            long damages = item.getDamages() != null ? item.getDamages() : 0;
            BigDecimal materialCost = null;
            for (ProductionMaterialUsage usage : item.getMaterialUsages()) {
                if (usage.getUnitCost() != null) {
                    BigDecimal cost = usage.getUnitCost().multiply(usage.getAmount());
                    materialCost = materialCost == null ? cost : materialCost.add(cost);
                }
            }
            activity.add(ActivityDto.builder()
                    .type("PRODUCTION")
                    .itemName(item.getProductType())
                    .quantity(BigDecimal.valueOf(item.getQtyProduced() != null ? item.getQtyProduced() : 0))
                    .unit("PCS")
                    .amount(materialCost)
                    .note(damages > 0 ? String.format("%,d", damages) + " damaged" : "No damages")
                    .date(item.getDailyProductionReport().getReportDate())
                    .recordedAt(item.getCreatedAt())
                    .build());
        });

        sales.stream().limit(ACTIVITY_LIMIT).forEach(sale -> activity.add(ActivityDto.builder()
                .type("SALE")
                .itemName(sale.getProductName())
                .quantity(BigDecimal.valueOf(sale.getQuantity()))
                .unit("PCS")
                .amount(sale.getUnitPrice().multiply(BigDecimal.valueOf(sale.getQuantity())))
                .note("Rs. " + String.format("%,.2f", sale.getUnitPrice()) + " per piece")
                .date(sale.getSaleDate())
                .recordedAt(sale.getCreatedAt())
                .build()));

        InventoryLogFilterDto loadsOnly = new InventoryLogFilterDto();
        loadsOnly.setMovement(StockMovement.IN);
        for (InventoryLog load : inventoryLogRepository.findAll(
                InventoryLogSpecifications.matching(null, loadsOnly),
                PageRequest.of(0, ACTIVITY_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")))) {
            activity.add(ActivityDto.builder()
                    .type("STOCK_LOAD")
                    .itemName(load.getItem().getName())
                    .quantity(load.getQtyIn())
                    .unit(String.valueOf(load.getItem().getUnitOfMeasure()))
                    .amount(load.getUnitCost() != null ? load.getUnitCost().multiply(load.getQtyIn()) : null)
                    .note(load.getBatchCode() != null ? "Stock " + load.getBatchCode() : "")
                    .date(load.getTransactionDate())
                    .recordedAt(load.getCreatedAt())
                    .build());
        }

        return activity.stream()
                .sorted(Comparator.comparing(ActivityDto::getRecordedAt,
                        Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder())))
                .limit(ACTIVITY_LIMIT)
                .toList();
    }
}
