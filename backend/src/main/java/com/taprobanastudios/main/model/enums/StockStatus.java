package com.taprobanastudios.main.model.enums;

import java.math.BigDecimal;

public enum StockStatus {
    HEALTHY,
    LOW,
    DEPLETED;

    // Stock at or below this level (but above zero) is LOW; zero or less is DEPLETED
    public static final BigDecimal LOW_STOCK_THRESHOLD = BigDecimal.TEN;

    public static StockStatus of(BigDecimal stock) {
        if (stock == null || stock.signum() <= 0) {
            return DEPLETED;
        }
        return stock.compareTo(LOW_STOCK_THRESHOLD) <= 0 ? LOW : HEALTHY;
    }
}
