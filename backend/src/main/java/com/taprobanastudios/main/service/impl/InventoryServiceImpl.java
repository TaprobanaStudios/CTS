package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.model.InventoryLog;
import com.taprobanastudios.main.model.Item;
import com.taprobanastudios.main.repository.InventoryLogRepository;
import com.taprobanastudios.main.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.dto.ItemDto;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.InventoryLogDto;

@Service
@Slf4j
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryLogRepository inventoryLogRepository;
    private final ItemRepository itemRepository;

    @Override
    @Transactional
    public void loadStock(StockOperationRequestDto requestDto) {
        log.info("Loading stock for item: {}", requestDto.getItemName());

        Item item = resolveItem(requestDto);

        BigDecimal openingStock = BigDecimal.ZERO;
        if (item.getLogs() != null) {
            for (InventoryLog existingLog : item.getLogs()) {
                BigDecimal in = existingLog.getQtyIn() != null ? existingLog.getQtyIn() : BigDecimal.ZERO;
                BigDecimal out = existingLog.getQtyOut() != null ? existingLog.getQtyOut() : BigDecimal.ZERO;
                openingStock = openingStock.add(in).subtract(out);
            }
        }

        InventoryLog logEntry = new InventoryLog();
        logEntry.setItem(item);
        logEntry.setTransactionDate(LocalDate.now());
        logEntry.setOpeningStock(openingStock);
        logEntry.setQtyIn(requestDto.getAmount());
        logEntry.setQtyOut(BigDecimal.ZERO);
        logEntry.setClosingStock(openingStock.add(requestDto.getAmount()));
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());

        inventoryLogRepository.save(logEntry);

        log.info("Stock loaded successfully for item: {}", item.getName());
    }

    @Override
    @Transactional
    public void deductStock(StockOperationRequestDto requestDto) {
        if (requestDto.getAmount() == null || requestDto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Invalid deduct amount: {}", requestDto.getAmount());
            return;
        }

        log.info("Deducting stock for item: {}", requestDto.getItemName());

        Item item = resolveItem(requestDto);

        BigDecimal openingStock = BigDecimal.ZERO;
        if (item.getLogs() != null) {
            for (InventoryLog existingLog : item.getLogs()) {
                BigDecimal in = existingLog.getQtyIn() != null ? existingLog.getQtyIn() : BigDecimal.ZERO;
                BigDecimal out = existingLog.getQtyOut() != null ? existingLog.getQtyOut() : BigDecimal.ZERO;
                openingStock = openingStock.add(in).subtract(out);
            }
        }

        InventoryLog logEntry = new InventoryLog();
        logEntry.setItem(item);
        logEntry.setTransactionDate(LocalDate.now());
        logEntry.setOpeningStock(openingStock);
        logEntry.setQtyIn(BigDecimal.ZERO);
        logEntry.setQtyOut(requestDto.getAmount());
        logEntry.setClosingStock(openingStock.subtract(requestDto.getAmount()));
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());

        inventoryLogRepository.save(logEntry);
        log.info("Stock deducted successfully for item: {}", item.getName());
    }

    private Item resolveItem(StockOperationRequestDto requestDto) {
        if (requestDto.getItemId() != null) {
            return itemRepository.findById(requestDto.getItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found for ID: " + requestDto.getItemId()));
        } else if (requestDto.getItemName() != null) {
            Item item = itemRepository.findByName(requestDto.getItemName());
            if (item == null) {
                throw new ResourceNotFoundException("Item not found for name: " + requestDto.getItemName());
            }
            return item;
        } else {
            throw new BadRequestException("Either itemId or itemName must be provided");
        }
    }

    @Override
    @Transactional
    public ItemDto createItem(ItemDto itemDto) {
        log.info("Creating new item: {}", itemDto.getName());
        Item item = new Item();
        item.setName(itemDto.getName());
        item.setUnitOfMeasure(itemDto.getUnitOfMeasure());
        Item saved = itemRepository.save(item);
        
        ItemDto dto = new ItemDto();
        dto.setId(saved.getId());
        dto.setName(saved.getName());
        dto.setUnitOfMeasure(saved.getUnitOfMeasure());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CurrentInventoryDto> getCurrentInventory() {
        log.info("Fetching current inventory status");
        return itemRepository.findAllWithLogs().stream().map(item -> {
            BigDecimal currentStock = BigDecimal.ZERO;
            if (item.getLogs() != null) {
                for (InventoryLog logEntry : item.getLogs()) {
                    BigDecimal in = logEntry.getQtyIn() != null ? logEntry.getQtyIn() : BigDecimal.ZERO;
                    BigDecimal out = logEntry.getQtyOut() != null ? logEntry.getQtyOut() : BigDecimal.ZERO;
                    currentStock = currentStock.add(in).subtract(out);
                }
            }
            java.time.LocalDateTime updateDate = item.getModifiedAt() != null ? item.getModifiedAt() : item.getCreatedAt();
            return new CurrentInventoryDto(
                    item.getId(), 
                    item.getName(), 
                    item.getUnitOfMeasure(), 
                    currentStock,
                    updateDate,
                    item.isDefaultMaterial());
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryLogDto> getBinLogs(UUID itemId) {
        return inventoryLogRepository.findByItem_IdOrderByCreatedAtDesc(itemId).stream().map(log -> {
            InventoryLogDto dto = new InventoryLogDto();
            dto.setId(log.getId());
            dto.setTransactionDate(log.getTransactionDate());
            dto.setOpeningStock(log.getOpeningStock());
            dto.setQtyIn(log.getQtyIn());
            dto.setQtyOut(log.getQtyOut());
            dto.setClosingStock(log.getClosingStock());
            dto.setAuthorizedBy(log.getAuthorizedBy());
            dto.setRemarks(log.getRemarks());
            
            ItemDto itemDto = new ItemDto();
            itemDto.setId(log.getItem().getId());
            itemDto.setName(log.getItem().getName());
            itemDto.setUnitOfMeasure(log.getItem().getUnitOfMeasure());
            dto.setItem(itemDto);
            
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryLogDto> getAllBinLogs() {
        return inventoryLogRepository.findAllByOrderByCreatedAtDesc().stream().map(log -> {
            InventoryLogDto dto = new InventoryLogDto();
            dto.setId(log.getId());
            dto.setTransactionDate(log.getTransactionDate());
            dto.setOpeningStock(log.getOpeningStock());
            dto.setQtyIn(log.getQtyIn());
            dto.setQtyOut(log.getQtyOut());
            dto.setClosingStock(log.getClosingStock());
            dto.setAuthorizedBy(log.getAuthorizedBy());
            dto.setRemarks(log.getRemarks());
            
            ItemDto itemDto = new ItemDto();
            itemDto.setId(log.getItem().getId());
            itemDto.setName(log.getItem().getName());
            itemDto.setUnitOfMeasure(log.getItem().getUnitOfMeasure());
            dto.setItem(itemDto);
            
            return dto;
        }).collect(Collectors.toList());
    }
}
