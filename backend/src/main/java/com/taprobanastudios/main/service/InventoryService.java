package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.ItemDto;
import com.taprobanastudios.main.dto.InventoryLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface InventoryService {
    void loadStock(StockOperationRequestDto requestDto);

    void deductStock(StockOperationRequestDto requestDto);

    List<CurrentInventoryDto> getCurrentInventory();

    Page<CurrentInventoryDto> getCurrentInventory(Pageable pageable);

    ItemDto createItem(ItemDto itemDto);

    List<InventoryLogDto> getBinLogs(UUID itemId);

    Page<InventoryLogDto> getBinLogs(UUID itemId, Pageable pageable);

    List<InventoryLogDto> getAllBinLogs();

    Page<InventoryLogDto> getAllBinLogs(Pageable pageable);
}
