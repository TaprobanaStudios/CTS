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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

import com.taprobanastudios.main.service.EditHistoryService;
import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.dto.ItemDto;
import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.InventoryLogDto;
import com.taprobanastudios.main.dto.InventoryFilterDto;
import com.taprobanastudios.main.dto.InventoryLogFilterDto;
import com.taprobanastudios.main.dto.InventoryLogUpdateDto;
import com.taprobanastudios.main.dto.StockBatchDto;
import com.taprobanastudios.main.repository.InventoryLogSpecifications;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.taprobanastudios.main.dto.InventorySummaryDto;
import com.taprobanastudios.main.model.enums.StockStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@Slf4j
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    // Remark written on deductions made by a production entry
    public static final String PRODUCTION_DEDUCTION_REMARK = "Auto-deducted from Daily Production";

    private static final DateTimeFormatter BATCH_DATE_FORMAT = DateTimeFormatter.ofPattern("yyMMdd");

    private final InventoryLogRepository inventoryLogRepository;
    private final ItemRepository itemRepository;
    private final EditHistoryService editHistoryService;

    @Override
    @Transactional
    public void loadStock(StockOperationRequestDto requestDto) {
        log.info("Loading stock for item: {}", requestDto.getItemName());

        if (requestDto.getAmount() == null || requestDto.getAmount().signum() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (requestDto.getUnitCost() != null && requestDto.getUnitCost().signum() < 0) {
            throw new BadRequestException("Unit cost cannot be negative");
        }

        Item item = resolveItem(requestDto);
        BigDecimal openingStock = inventoryLogRepository.sumCurrentStock(item.getId());
        LocalDate today = LocalDate.now();

        InventoryLog logEntry = new InventoryLog();
        logEntry.setItem(item);
        logEntry.setTransactionDate(today);
        logEntry.setOpeningStock(openingStock);
        logEntry.setQtyIn(requestDto.getAmount());
        logEntry.setUnitCost(requestDto.getUnitCost());
        logEntry.setQtyOut(BigDecimal.ZERO);
        logEntry.setClosingStock(openingStock.add(requestDto.getAmount()));
        logEntry.setBatchCode(nextBatchCode(item, today));
        logEntry.setRemainingQty(requestDto.getAmount());
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());

        inventoryLogRepository.save(logEntry);

        log.info("Stock {} loaded successfully for item: {}", logEntry.getBatchCode(), item.getName());
    }

    @Override
    @Transactional
    public List<InventoryLogDto> deductStock(StockOperationRequestDto requestDto) {
        if (requestDto.getAmount() == null || requestDto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Invalid deduct amount: {}", requestDto.getAmount());
            return List.of();
        }

        if (requestDto.getUnitCost() != null && requestDto.getUnitCost().signum() < 0) {
            throw new BadRequestException("Unit cost cannot be negative");
        }

        log.info("Deducting stock for item: {}", requestDto.getItemName());

        Item item = resolveItem(requestDto);
        BigDecimal runningStock = inventoryLogRepository.sumCurrentStock(item.getId());
        requireAvailable(item, runningStock, requestDto.getAmount());
        BigDecimal left = requestDto.getAmount();
        List<InventoryLog> deductions = new ArrayList<>();

        if (requestDto.getBatchId() != null) {
            InventoryLog batch = inventoryLogRepository.findById(requestDto.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stock not found for ID: " + requestDto.getBatchId()));
            BigDecimal remaining = batch.getRemainingQty() != null ? batch.getRemainingQty() : BigDecimal.ZERO;
            if (!batch.getItem().getId().equals(item.getId())) {
                throw new BadRequestException("Stock " + batch.getBatchCode() + " does not belong to " + item.getName());
            }
            if (remaining.compareTo(left) < 0) {
                throw new BadRequestException("Only " + remaining.stripTrailingZeros().toPlainString() + " left in stock "
                        + batch.getBatchCode() + " of " + item.getName());
            }
            deductions.add(deductFrom(item, batch, left, runningStock, requestDto));
        } else {
            // Oldest stock first
            for (InventoryLog batch : inventoryLogRepository
                    .findByItem_IdAndRemainingQtyGreaterThanOrderByCreatedAtAsc(item.getId(), BigDecimal.ZERO)) {
                if (left.signum() <= 0) {
                    break;
                }
                BigDecimal taken = left.min(batch.getRemainingQty());
                deductions.add(deductFrom(item, batch, taken, runningStock, requestDto));
                runningStock = runningStock.subtract(taken);
                left = left.subtract(taken);
            }
            // Anything beyond the loaded stocks is still recorded, against no stock
            if (left.signum() > 0) {
                deductions.add(deductFrom(item, null, left, runningStock, requestDto));
            }
        }

        log.info("Stock deducted successfully for item: {}", item.getName());
        return deductions.stream().map(this::mapToLogDto).collect(Collectors.toList());
    }

    // Stock may never go below zero: everything that reads the ledger (balances, stock values,
    // production costs, the dashboard) would be wrong from that entry on
    private void requireAvailable(Item item, BigDecimal available, BigDecimal requested) {
        if (requested.compareTo(available) > 0) {
            BigDecimal inStock = available.max(BigDecimal.ZERO);
            throw new BadRequestException("Only " + inStock.stripTrailingZeros().toPlainString() + " "
                    + item.getUnitOfMeasure() + " of " + item.getName() + " is available in inventory, but "
                    + requested.stripTrailingZeros().toPlainString() + " was asked for. "
                    + "Taking more than is available would make the stock negative and affect balances, "
                    + "costs and reports across the whole system. Load the stock first or reduce the quantity.");
        }
    }

    private InventoryLog deductFrom(Item item, InventoryLog batch, BigDecimal amount, BigDecimal openingStock,
                                    StockOperationRequestDto requestDto) {
        InventoryLog logEntry = new InventoryLog();
        logEntry.setItem(item);
        logEntry.setTransactionDate(LocalDate.now());
        logEntry.setOpeningStock(openingStock);
        logEntry.setQtyIn(BigDecimal.ZERO);
        logEntry.setQtyOut(amount);
        logEntry.setClosingStock(openingStock.subtract(amount));
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());
        if (batch != null) {
            batch.setRemainingQty(batch.getRemainingQty().subtract(amount));
            // A stock loaded without a cost takes the one supplied now, so it is costed from here on
            if (batch.getUnitCost() == null) {
                batch.setUnitCost(requestDto.getUnitCost());
            }
            logEntry.setSourceBatch(batch);
            logEntry.setUnitCost(batch.getUnitCost());
        } else {
            logEntry.setUnitCost(requestDto.getUnitCost());
        }
        return inventoryLogRepository.save(logEntry);
    }

    // e.g. CEM-261013-01: material prefix, load date, running number for that prefix and day
    private String nextBatchCode(Item item, LocalDate date) {
        String letters = item.getName().replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        String prefix = (letters.isEmpty() ? "STK" : letters.substring(0, Math.min(3, letters.length())))
                + "-" + date.format(BATCH_DATE_FORMAT) + "-";
        return prefix + String.format("%02d", inventoryLogRepository.countByBatchCodeStartingWith(prefix) + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockBatchDto> getOpenBatches(UUID itemId) {
        List<InventoryLog> batches = itemId != null
                ? inventoryLogRepository.findByItem_IdAndRemainingQtyGreaterThanOrderByCreatedAtAsc(itemId, BigDecimal.ZERO)
                : inventoryLogRepository.findByRemainingQtyGreaterThanOrderByCreatedAtAsc(BigDecimal.ZERO);
        return batches.stream().map(batch -> new StockBatchDto(
                batch.getId(),
                batch.getBatchCode(),
                batch.getItem().getId(),
                batch.getItem().getName(),
                batch.getItem().getUnitOfMeasure(),
                batch.getTransactionDate(),
                batch.getQtyIn(),
                batch.getRemainingQty(),
                batch.getUnitCost())).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void backfillStockBatches() {
        Map<UUID, List<InventoryLog>> loadsByItem = new LinkedHashMap<>();
        for (InventoryLog load : inventoryLogRepository
                .findByBatchCodeIsNullAndQtyInGreaterThanOrderByCreatedAtAsc(BigDecimal.ZERO)) {
            loadsByItem.computeIfAbsent(load.getItem().getId(), itemId -> new ArrayList<>()).add(load);
        }

        loadsByItem.values().forEach(loads -> {
            Item item = loads.get(0).getItem();
            // Stock is used oldest-first, so whatever is left belongs to the newest loads
            BigDecimal unassigned = inventoryLogRepository.sumCurrentStock(item.getId()).max(BigDecimal.ZERO);
            for (int i = loads.size() - 1; i >= 0; i--) {
                InventoryLog load = loads.get(i);
                BigDecimal remaining = unassigned.min(load.getQtyIn());
                load.setRemainingQty(remaining);
                unassigned = unassigned.subtract(remaining);
            }
            for (InventoryLog load : loads) {
                load.setBatchCode(nextBatchCode(item, load.getTransactionDate()));
                inventoryLogRepository.saveAndFlush(load);
            }
            log.info("Assigned stock IDs to {} existing loads of {}", loads.size(), item.getName());
        });
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
        return itemRepository.findAllWithLogs().stream().map(this::mapToCurrentInventoryDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CurrentInventoryDto> getCurrentInventory(InventoryFilterDto filter, Pageable pageable) {
        log.info("Fetching current inventory status with filter: {} and pageable: {}", filter, pageable);
        return itemRepository.findCurrentInventory(filter, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentInventoryDto getCurrentInventoryItem(UUID itemId) {
        return mapToCurrentInventoryDto(itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found for ID: " + itemId)));
    }

    @Override
    @Transactional(readOnly = true)
    public InventorySummaryDto getInventorySummary() {
        log.info("Fetching inventory summary");
        long healthy = 0;
        long low = 0;
        long depleted = 0;
        for (BigDecimal stock : itemRepository.findCurrentStockLevels()) {
            switch (StockStatus.of(stock)) {
                case HEALTHY -> healthy++;
                case LOW -> low++;
                case DEPLETED -> depleted++;
            }
        }
        return new InventorySummaryDto(healthy + low + depleted, healthy, low, depleted);
    }

    private CurrentInventoryDto mapToCurrentInventoryDto(Item item) {
        BigDecimal currentStock = BigDecimal.ZERO;
        // Last update is the latest of the item's own change and its most recent stock movement
        java.time.LocalDateTime updateDate = item.getModifiedAt() != null ? item.getModifiedAt() : item.getCreatedAt();
        if (item.getLogs() != null) {
            for (InventoryLog logEntry : item.getLogs()) {
                BigDecimal in = logEntry.getQtyIn() != null ? logEntry.getQtyIn() : BigDecimal.ZERO;
                BigDecimal out = logEntry.getQtyOut() != null ? logEntry.getQtyOut() : BigDecimal.ZERO;
                currentStock = currentStock.add(in).subtract(out);
                if (logEntry.getCreatedAt() != null && (updateDate == null || logEntry.getCreatedAt().isAfter(updateDate))) {
                    updateDate = logEntry.getCreatedAt();
                }
            }
        }
        return new CurrentInventoryDto(
                item.getId(),
                item.getName(),
                item.getUnitOfMeasure(),
                currentStock,
                StockStatus.of(currentStock),
                updateDate,
                item.isDefaultMaterial());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryLogDto> getBinLogs(UUID itemId) {
        return inventoryLogRepository.findByItem_IdOrderByCreatedAtDesc(itemId).stream().map(this::mapToLogDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryLogDto> getBinLogs(UUID itemId, InventoryLogFilterDto filter, Pageable pageable) {
        log.info("Fetching bin logs for item {} with filter: {} and pageable: {}", itemId, filter, pageable);
        return findBinLogs(itemId, filter, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryLogDto> getAllBinLogs() {
        return inventoryLogRepository.findAllByOrderByCreatedAtDesc().stream().map(this::mapToLogDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryLogDto> getAllBinLogs(InventoryLogFilterDto filter, Pageable pageable) {
        log.info("Fetching all bin logs with filter: {} and pageable: {}", filter, pageable);
        return findBinLogs(null, filter, pageable);
    }

    private Page<InventoryLogDto> findBinLogs(UUID itemId, InventoryLogFilterDto filter, Pageable pageable) {
        // Newest entry first unless the caller asks for a transaction date order
        Sort.Direction direction = Sort.Direction.DESC;
        Sort sort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            if (!"transactionDate".equals(order.getProperty())) {
                throw new BadRequestException("Cannot sort bin logs by: " + order.getProperty());
            }
            direction = order.getDirection();
            sort = Sort.by(direction, "transactionDate");
        }
        // One deduction spread over several stocks is saved in the same instant; the falling
        // balance keeps those entries in the order they were applied
        sort = sort.and(Sort.by(direction, "createdAt"))
                .and(Sort.by(direction.isAscending() ? Sort.Direction.DESC : Sort.Direction.ASC, "closingStock"));
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return inventoryLogRepository.findAll(InventoryLogSpecifications.matching(itemId, filter), sorted)
                .map(this::mapToLogDto);
    }

    @Override
    @Transactional
    public InventoryLogDto updateBinLog(UUID logId, InventoryLogUpdateDto updateDto) {
        InventoryLog entry = inventoryLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Bin card entry not found for ID: " + logId));
        log.info("Updating bin card entry {} of {}", logId, entry.getItem().getName());

        // Deductions written by a production entry belong to that entry and are locked
        if (isProductionDeduction(entry)) {
            throw new BadRequestException(
                    "This entry was added automatically by a production entry and cannot be edited");
        }
        if (updateDto.getEditedBy() == null || updateDto.getEditedBy().isBlank()) {
            throw new BadRequestException("Edited By is required");
        }
        if (updateDto.getQuantity() == null || updateDto.getQuantity().signum() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (updateDto.getUnitCost() != null && updateDto.getUnitCost().signum() < 0) {
            throw new BadRequestException("Unit cost cannot be negative");
        }

        boolean isLoad = entry.getQtyIn() != null && entry.getQtyIn().signum() > 0;
        String unit = String.valueOf(entry.getItem().getUnitOfMeasure());

        // Everything this edit changes, for the history table
        ChangeList changes = new ChangeList();
        changes.compare("Quantity (" + unit + ")", isLoad ? entry.getQtyIn() : entry.getQtyOut(), updateDto.getQuantity());
        if (isLoad) {
            changes.compare("Unit cost (Rs.)", entry.getUnitCost(), updateDto.getUnitCost());
        }
        changes.compare("Date", entry.getTransactionDate(),
                updateDto.getTransactionDate() != null ? updateDto.getTransactionDate() : entry.getTransactionDate());
        changes.compare("Authorized by", entry.getAuthorizedBy(), updateDto.getAuthorizedBy());
        changes.compare("Remarks", entry.getRemarks(), updateDto.getRemarks());
        if (changes.isEmpty()) {
            return mapToLogDto(entry);
        }

        if (isLoad) {
            // A load cannot shrink below what has already been taken from it
            BigDecimal remaining = entry.getRemainingQty() != null ? entry.getRemainingQty() : BigDecimal.ZERO;
            BigDecimal used = entry.getQtyIn().subtract(remaining);
            if (updateDto.getQuantity().compareTo(used) < 0) {
                throw new BadRequestException(used.stripTrailingZeros().toPlainString() + " " + unit
                        + " of this stock has already been used by deductions or production, so its quantity "
                        + "cannot be set below " + used.stripTrailingZeros().toPlainString() + ". Going lower would "
                        + "leave those entries with nothing to draw on and affect balances and costs across the whole system.");
            }
            entry.setQtyIn(updateDto.getQuantity());
            entry.setRemainingQty(updateDto.getQuantity().subtract(used));

            boolean costChanged = updateDto.getUnitCost() == null
                    ? entry.getUnitCost() != null
                    : entry.getUnitCost() == null || updateDto.getUnitCost().compareTo(entry.getUnitCost()) != 0;
            entry.setUnitCost(updateDto.getUnitCost());
            if (costChanged) {
                // Everything taken from this stock was costed from it
                inventoryLogRepository.updateUnitCostOfDeductions(entry.getId(), updateDto.getUnitCost());
                inventoryLogRepository.updateUnitCostOfProductionUsages(entry.getId(), updateDto.getUnitCost());
            }
        } else {
            BigDecimal change = updateDto.getQuantity().subtract(entry.getQtyOut());
            if (change.signum() != 0) {
                if (change.signum() > 0) {
                    // What is in inventory now is all that can be added to this deduction
                    BigDecimal available = inventoryLogRepository.sumCurrentStock(entry.getItem().getId());
                    if (change.compareTo(available) > 0) {
                        BigDecimal most = entry.getQtyOut().add(available.max(BigDecimal.ZERO));
                        throw new BadRequestException("Only " + available.max(BigDecimal.ZERO).stripTrailingZeros().toPlainString()
                                + " " + unit + " more of " + entry.getItem().getName() + " is available in inventory, so this "
                                + "deduction can be at most " + most.stripTrailingZeros().toPlainString() + ". Taking more "
                                + "would make the stock negative and affect balances, costs and reports across the whole system.");
                    }
                }
                InventoryLog batch = entry.getSourceBatch();
                if (batch != null) {
                    BigDecimal remaining = batch.getRemainingQty().subtract(change);
                    if (remaining.signum() < 0) {
                        throw new BadRequestException("Only " + batch.getRemainingQty().stripTrailingZeros().toPlainString()
                                + " " + unit + " more is left in stock " + batch.getBatchCode() + ", which this deduction "
                                + "was taken from. The rest of that stock has already been used elsewhere.");
                    }
                    batch.setRemainingQty(remaining);
                }
                entry.setQtyOut(updateDto.getQuantity());
            }
        }

        if (updateDto.getTransactionDate() != null) {
            entry.setTransactionDate(updateDto.getTransactionDate());
        }
        entry.setAuthorizedBy(updateDto.getAuthorizedBy());
        entry.setRemarks(updateDto.getRemarks());
        entry.setEditedBy(updateDto.getEditedBy().trim());
        entry.setEditedAt(LocalDateTime.now());
        inventoryLogRepository.saveAndFlush(entry);

        InventoryLog stock = isLoad ? entry : entry.getSourceBatch();
        entry.setEditCount((entry.getEditCount() != null ? entry.getEditCount() : 0) + 1);
        entry.setEditNote(editHistoryService.record(
                isLoad ? "STOCK_LOAD" : "STOCK_DEDUCTION",
                entry.getId(),
                entry.getItem().getName() + (stock != null && stock.getBatchCode() != null ? " · stock " + stock.getBatchCode() : ""),
                entry.getEditedBy(),
                entry.getEditedAt(),
                changes.lines(),
                updateDto.getEditRemark()));
        inventoryLogRepository.saveAndFlush(entry);

        recalculateBalances(entry.getItem().getId());
        return mapToLogDto(entry);
    }

    private boolean isProductionDeduction(InventoryLog entry) {
        return PRODUCTION_DEDUCTION_REMARK.equals(entry.getRemarks());
    }

    // Rebuilds the opening and closing balance of every entry of a material, oldest first
    private void recalculateBalances(UUID itemId) {
        // Same order the ledger is shown in: entries saved in the same instant keep their falling balance
        List<InventoryLog> entries = inventoryLogRepository.findByItem_Id(itemId,
                Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.DESC, "closingStock")));
        BigDecimal running = BigDecimal.ZERO;
        for (InventoryLog entry : entries) {
            BigDecimal in = entry.getQtyIn() != null ? entry.getQtyIn() : BigDecimal.ZERO;
            BigDecimal out = entry.getQtyOut() != null ? entry.getQtyOut() : BigDecimal.ZERO;
            entry.setOpeningStock(running);
            running = running.add(in).subtract(out);
            entry.setClosingStock(running);
        }
        inventoryLogRepository.saveAll(entries);
    }

    private InventoryLogDto mapToLogDto(InventoryLog logEntry) {
        InventoryLogDto dto = new InventoryLogDto();
        dto.setId(logEntry.getId());
        dto.setTransactionDate(logEntry.getTransactionDate());
        dto.setOpeningStock(logEntry.getOpeningStock());
        dto.setQtyIn(logEntry.getQtyIn());
        dto.setQtyOut(logEntry.getQtyOut());
        dto.setClosingStock(logEntry.getClosingStock());
        dto.setUnitCost(logEntry.getUnitCost());
        InventoryLog batch = logEntry.getBatchCode() != null ? logEntry : logEntry.getSourceBatch();
        if (batch != null) {
            dto.setBatchId(batch.getId());
            dto.setBatchCode(batch.getBatchCode());
        }
        dto.setAuthorizedBy(logEntry.getAuthorizedBy());
        dto.setRemarks(logEntry.getRemarks());
        dto.setProductionDeduction(isProductionDeduction(logEntry));
        dto.setEditedBy(logEntry.getEditedBy());
        dto.setEditedAt(logEntry.getEditedAt());
        dto.setEditCount(logEntry.getEditCount());
        dto.setEditNote(logEntry.getEditNote());
        
        if (logEntry.getItem() != null) {
            ItemDto itemDto = new ItemDto();
            itemDto.setId(logEntry.getItem().getId());
            itemDto.setName(logEntry.getItem().getName());
            itemDto.setUnitOfMeasure(logEntry.getItem().getUnitOfMeasure());
            dto.setItem(itemDto);
        }
        
        return dto;
    }
}
