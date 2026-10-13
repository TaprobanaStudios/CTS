package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.InventoryFilterDto;
import com.taprobanastudios.main.dto.InventorySummaryDto;
import com.taprobanastudios.main.dto.ItemDto;
import com.taprobanastudios.main.dto.InventoryLogDto;
import com.taprobanastudios.main.dto.InventoryLogFilterDto;
import com.taprobanastudios.main.dto.InventoryLogUpdateDto;
import com.taprobanastudios.main.dto.StockBatchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface InventoryService {
    void loadStock(StockOperationRequestDto requestDto);

    // Returns one ledger entry per stock the quantity was taken from
    List<InventoryLogDto> deductStock(StockOperationRequestDto requestDto);

    // Stocks with quantity left, oldest first; itemId == null returns every material's
    List<StockBatchDto> getOpenBatches(UUID itemId);

    // Corrects one bin card entry and records who did it
    InventoryLogDto updateBinLog(UUID logId, InventoryLogUpdateDto updateDto);

    // Gives loads recorded before stock IDs existed an ID and their share of the current stock
    void backfillStockBatches();

    List<CurrentInventoryDto> getCurrentInventory();

    Page<CurrentInventoryDto> getCurrentInventory(InventoryFilterDto filter, Pageable pageable);

    InventorySummaryDto getInventorySummary();

    ItemDto createItem(ItemDto itemDto);

    List<InventoryLogDto> getBinLogs(UUID itemId);

    Page<InventoryLogDto> getBinLogs(UUID itemId, InventoryLogFilterDto filter, Pageable pageable);

    List<InventoryLogDto> getAllBinLogs();

    Page<InventoryLogDto> getAllBinLogs(InventoryLogFilterDto filter, Pageable pageable);
}
