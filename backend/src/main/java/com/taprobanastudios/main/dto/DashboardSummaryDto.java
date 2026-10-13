package com.taprobanastudios.main.dto;

import com.taprobanastudios.main.model.enums.StockStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Everything the dashboard shows for one period (today, week, month, quarter or year to date)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {
    private String period;
    private LocalDate startDate;
    private LocalDate endDate;

    private int activeWorkers;

    // Production in the period
    private long totalProduced;
    private long totalDamages;
    private double damageRate;
    private long avgDailyProduction;
    // Cost of the materials used that had a buying cost recorded
    private BigDecimal materialCost;
    // true when some materials used had no cost and are missing from materialCost
    private boolean materialCostPartial;

    // Sales in the period
    private long unitsSold;
    private BigDecimal salesRevenue;
    // Revenue minus material cost, over the sales whose material cost is known; null when none is
    private BigDecimal salesProfit;
    private boolean salesProfitPartial;

    // Current state, independent of the period
    private InventorySummaryDto inventory;
    private List<StockAlertDto> stockAlerts;
    private List<ProductSummaryDto> products;

    private List<TrendPointDto> trend;
    private List<ActivityDto> recentActivity;

    // A material that is low or out of stock
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StockAlertDto {
        private String itemName;
        private double currentStock;
        private String unitOfMeasure;
        private StockStatus status;
    }

    // One bar of the trend charts: a day or a month, depending on the period
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendPointDto {
        private String label;
        private long produced;
        private long damaged;
        private long sold;
        private BigDecimal revenue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductSummaryDto {
        private String productName;
        private long currentStock;
        private long producedInPeriod;
        private long soldInPeriod;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActivityDto {
        // PRODUCTION, SALE or STOCK_LOAD
        private String type;
        // The product or material the entry is about
        private String itemName;
        private BigDecimal quantity;
        private String unit;
        // Money involved: sale total, cost of a stock load, or material cost of a production; null if unknown
        private BigDecimal amount;
        // e.g. "50 damaged", "Rs. 275.00 per piece", "Stock CEM-261012-02"
        private String note;
        private LocalDate date;
        private LocalDateTime recordedAt;
    }
}
