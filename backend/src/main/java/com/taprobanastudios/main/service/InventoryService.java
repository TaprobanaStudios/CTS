package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.StockOperationRequestDto;

public interface InventoryService {
    void loadStock(StockOperationRequestDto requestDto);
    void deductStock(StockOperationRequestDto requestDto);
}
