package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.InventoryFilterDto;
import com.taprobanastudios.main.dto.InventoryLogDto;
import com.taprobanastudios.main.dto.InventoryLogFilterDto;
import com.taprobanastudios.main.dto.InventoryLogUpdateDto;
import com.taprobanastudios.main.dto.InventorySummaryDto;
import com.taprobanastudios.main.dto.StockBatchDto;
import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController extends AbstractController {

    private final InventoryService inventoryService;

    @PostMapping("/load")
    public ResponseEntity<Void> loadStock(@RequestBody StockOperationRequestDto requestDto) {
        inventoryService.loadStock(requestDto);
        return sendNoContentResponse();
    }

    @PostMapping("/deduct")
    public ResponseEntity<Void> deductStock(@RequestBody StockOperationRequestDto requestDto) {
        inventoryService.deductStock(requestDto);
        return sendNoContentResponse();
    }

    @GetMapping("/batches")
    public ResponseEntity<List<StockBatchDto>> getOpenBatches(@RequestParam(required = false) UUID itemId) {
        return sendSuccessResponse(inventoryService.getOpenBatches(itemId));
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentInventory(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            InventoryFilterDto filter,
            Pageable pageable) {
        // Without page/size the full list is returned (item pickers rely on this)
        if (page == null && size == null) {
            return sendSuccessResponse(inventoryService.getCurrentInventory());
        }
        return sendSuccessResponse(inventoryService.getCurrentInventory(filter, pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<InventorySummaryDto> getInventorySummary() {
        return sendSuccessResponse(inventoryService.getInventorySummary());
    }

    @PostMapping("/items")
    public ResponseEntity<com.taprobanastudios.main.dto.ItemDto> createItem(@RequestBody com.taprobanastudios.main.dto.ItemDto itemDto) {
        return sendCreatedResponse(inventoryService.createItem(itemDto));
    }

    @GetMapping("/bin/{itemId}")
    public ResponseEntity<?> getBinLogs(
            @PathVariable UUID itemId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            InventoryLogFilterDto filter,
            Pageable pageable) {
        if (page == null && size == null && (pageable == null || pageable.isUnpaged())) {
            return sendSuccessResponse(inventoryService.getBinLogs(itemId));
        }
        return sendSuccessResponse(inventoryService.getBinLogs(itemId, filter, pageable));
    }

    @PutMapping("/bin/{logId}")
    public ResponseEntity<InventoryLogDto> updateBinLog(@PathVariable UUID logId,
                                                        @RequestBody InventoryLogUpdateDto updateDto) {
        return sendUpdatedResponse(inventoryService.updateBinLog(logId, updateDto));
    }

    @GetMapping("/bin/all")
    public ResponseEntity<?> getAllBinLogs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            InventoryLogFilterDto filter,
            Pageable pageable) {
        if (page == null && size == null && (pageable == null || pageable.isUnpaged())) {
            return sendSuccessResponse(inventoryService.getAllBinLogs());
        }
        return sendSuccessResponse(inventoryService.getAllBinLogs(filter, pageable));
    }
}

