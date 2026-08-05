package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.StockOperationRequestDto;

import java.util.List;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.ItemDto;

public interface InventoryService {
    void loadStock(StockOperationRequestDto requestDto);
    void deductStock(StockOperationRequestDto requestDto);
    List<CurrentInventoryDto> getCurrentInventory();
    ItemDto createItem(ItemDto itemDto);
    List<com.taprobanastudios.main.dto.InventoryLogDto> getBinLogs(java.util.UUID itemId);
    List<com.taprobanastudios.main.dto.InventoryLogDto> getAllBinLogs();
}
