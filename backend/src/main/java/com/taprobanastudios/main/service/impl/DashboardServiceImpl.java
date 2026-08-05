package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.DashboardSummaryDto;
import com.taprobanastudios.main.model.Item;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.repository.ProductionItemRepository;
import com.taprobanastudios.main.repository.WorkerRepository;
import com.taprobanastudios.main.service.DashboardService;
import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final WorkerRepository workerRepository;
    private final ProductionItemRepository productionItemRepository;
    private final InventoryService inventoryService;

    @Override
    public DashboardSummaryDto getDashboardSummary(String period) {
        int activeWorkers = workerRepository.countByStatus("ACTIVE");

        List<ProductionItem> allProductionItems = productionItemRepository.findAll();
        
        LocalDate startDate;
        if ("today".equalsIgnoreCase(period)) {
            startDate = LocalDate.now();
        } else if ("week".equalsIgnoreCase(period)) {
            startDate = LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        } else if ("quarter".equalsIgnoreCase(period)) {
            int currentMonth = LocalDate.now().getMonthValue();
            int quarterStartMonth = ((currentMonth - 1) / 3) * 3 + 1;
            startDate = LocalDate.now().withMonth(quarterStartMonth).withDayOfMonth(1);
        } else if ("year".equalsIgnoreCase(period)) {
            startDate = LocalDate.now().withDayOfYear(1);
        } else {
            startDate = LocalDate.now().withDayOfMonth(1); // month is default
        }

        List<ProductionItem> currentPeriodProduction = allProductionItems.stream()
                .filter(pi -> !pi.getDailyProductionReport().getReportDate().isBefore(startDate))
                .toList();

        long totalProductionThisPeriod = currentPeriodProduction.stream()
                .mapToLong(ProductionItem::getQtyProduced)
                .sum();

        long avgDailyProduction = 0;
        if (!currentPeriodProduction.isEmpty()) {
            long uniqueDays = currentPeriodProduction.stream()
                    .map(pi -> pi.getDailyProductionReport().getReportDate())
                    .distinct()
                    .count();
            avgDailyProduction = uniqueDays > 0 ? totalProductionThisPeriod / uniqueDays : 0;
        }

        double damageRate = 0;
        if (totalProductionThisPeriod > 0) {
            long totalDamages = currentPeriodProduction.stream()
                    .mapToLong(pi -> pi.getDamages() != null ? pi.getDamages() : 0)
                    .sum();
            damageRate = ((double) totalDamages / totalProductionThisPeriod) * 100.0;
        }

        java.util.function.Function<ProductionItem, String> dateGrouper = pi -> {
            LocalDate date = pi.getDailyProductionReport().getReportDate();
            if ("year".equalsIgnoreCase(period) || "quarter".equalsIgnoreCase(period)) {
                return date.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
            } else if ("month".equalsIgnoreCase(period)) {
                return "Week " + (date.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR) - date.withDayOfMonth(1).get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR) + 1);
            }
            return date.toString();
        };

        Map<String, Long> productionChartData = currentPeriodProduction.stream()
                .collect(Collectors.groupingBy(
                        dateGrouper,
                        Collectors.summingLong(ProductionItem::getQtyProduced)
                ));

        Map<String, Double> damageChartData = currentPeriodProduction.stream()
                .collect(Collectors.groupingBy(
                        dateGrouper,
                        Collectors.averagingDouble(pi -> {
                            long qty = pi.getQtyProduced() != null ? pi.getQtyProduced() : 0;
                            long dmg = pi.getDamages() != null ? pi.getDamages() : 0;
                            return qty > 0 ? ((double) dmg / qty) * 100.0 : 0.0;
                        })
                ));

        Map<String, Long> productionByProductType = currentPeriodProduction.stream()
                .collect(Collectors.groupingBy(
                        ProductionItem::getProductType,
                        Collectors.summingLong(ProductionItem::getQtyProduced)
                ));

        List<DashboardSummaryDto.StockAlertDto> lowStockAlerts = inventoryService.getCurrentInventory().stream()
                .filter(item -> item.getCurrentStock() != null)
                .sorted(java.util.Comparator.comparing(item -> item.getCurrentStock().doubleValue()))
                .limit(5)
                .map(item -> DashboardSummaryDto.StockAlertDto.builder()
                        .itemName(item.getItemName())
                        .currentStock(item.getCurrentStock().doubleValue())
                        .unitOfMeasure(item.getUnitOfMeasure() != null ? item.getUnitOfMeasure().name() : "")
                        .build())
                .toList();

        List<DashboardSummaryDto.StockAlertDto> highStockAlerts = inventoryService.getCurrentInventory().stream()
                .filter(item -> item.getCurrentStock() != null)
                .sorted((a, b) -> Double.compare(b.getCurrentStock().doubleValue(), a.getCurrentStock().doubleValue()))
                .limit(5)
                .map(item -> DashboardSummaryDto.StockAlertDto.builder()
                        .itemName(item.getItemName())
                        .currentStock(item.getCurrentStock().doubleValue())
                        .unitOfMeasure(item.getUnitOfMeasure() != null ? item.getUnitOfMeasure().name() : "")
                        .build())
                .toList();

        return DashboardSummaryDto.builder()
                .activeWorkers(activeWorkers)
                .totalProductionThisMonth(totalProductionThisPeriod)
                .avgDailyProduction(avgDailyProduction)
                .damageRate(damageRate)
                .lowStockAlerts(lowStockAlerts)
                .highStockAlerts(highStockAlerts)
                .productionChartData(productionChartData)
                .damageChartData(damageChartData)
                .productionByProductType(productionByProductType)
                .build();
    }
}
