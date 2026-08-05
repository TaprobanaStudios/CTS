package com.taprobanastudios.main.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {
    private int activeWorkers;
    private long totalProductionThisMonth;
    private long avgDailyProduction;
    private double damageRate;
    
    private List<StockAlertDto> lowStockAlerts;
    private List<StockAlertDto> highStockAlerts;
    private Map<String, Long> productionChartData;
    private Map<String, Double> damageChartData;
    private Map<String, Long> productionByProductType;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StockAlertDto {
        private String itemName;
        private double currentStock;
        private String unitOfMeasure;
    }
}
