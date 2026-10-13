package com.taprobanastudios.main.dto;

import lombok.Data;

import java.math.BigDecimal;

// One product on the production bin card: its stock now, and what happened to it this month
@Data
public class ProductBinSummaryDto {
    // Empty when the figures cover all products together
    private String productName;
    // produced - damaged - used in other products - sold, over all time
    private long currentStock;
    private long produced;
    private long damages;
    private long used;
    private long sold;
    private MonthTotals thisMonth;

    @Data
    public static class MonthTotals {
        private long produced;
        private long damages;
        private long used;
        private long sold;
        // Cost of the materials used this month; null when none of them had a cost (or it was not asked for)
        private BigDecimal materialCost;
        // true when some materials had no cost and are missing from materialCost
        private boolean materialCostPartial;
    }
}
