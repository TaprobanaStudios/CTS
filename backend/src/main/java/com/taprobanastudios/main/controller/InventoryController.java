package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



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
    public ResponseEntity<java.util.List<com.taprobanastudios.main.dto.CurrentInventoryDto>> getCurrentInventory() {
        return sendSuccessResponse(inventoryService.getCurrentInventory());
    }

    @PostMapping("/items")
    public ResponseEntity<com.taprobanastudios.main.dto.ItemDto> createItem(@RequestBody com.taprobanastudios.main.dto.ItemDto itemDto) {
        return sendCreatedResponse(inventoryService.createItem(itemDto));
    }

    @GetMapping("/bin/{itemId}")
    public ResponseEntity<java.util.List<com.taprobanastudios.main.dto.InventoryLogDto>> getBinLogs(@PathVariable java.util.UUID itemId) {
        return sendSuccessResponse(inventoryService.getBinLogs(itemId));
    }

    @GetMapping("/bin/all")
    public ResponseEntity<java.util.List<com.taprobanastudios.main.dto.InventoryLogDto>> getAllBinLogs() {
        return sendSuccessResponse(inventoryService.getAllBinLogs());
    }
}
