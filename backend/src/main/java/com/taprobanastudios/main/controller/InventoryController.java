package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentInventory(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Pageable pageable) {
        if (page == null && size == null && (pageable == null || pageable.isUnpaged())) {
            return sendSuccessResponse(inventoryService.getCurrentInventory());
        }
        return sendSuccessResponse(inventoryService.getCurrentInventory(pageable));
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
            Pageable pageable) {
        if (page == null && size == null && (pageable == null || pageable.isUnpaged())) {
            return sendSuccessResponse(inventoryService.getBinLogs(itemId));
        }
        return sendSuccessResponse(inventoryService.getBinLogs(itemId, pageable));
    }

    @GetMapping("/bin/all")
    public ResponseEntity<?> getAllBinLogs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Pageable pageable) {
        if (page == null && size == null && (pageable == null || pageable.isUnpaged())) {
            return sendSuccessResponse(inventoryService.getAllBinLogs());
        }
        return sendSuccessResponse(inventoryService.getAllBinLogs(pageable));
    }
}

