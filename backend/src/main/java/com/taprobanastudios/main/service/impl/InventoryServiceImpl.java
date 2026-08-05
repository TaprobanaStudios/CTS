package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.model.InventoryLog;
import com.taprobanastudios.main.model.Material;
import com.taprobanastudios.main.repository.InventoryLogRepository;
import com.taprobanastudios.main.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.taprobanastudios.main.service.InventoryService;
import com.taprobanastudios.main.dto.StockOperationRequestDto;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.exception.BadRequestException;

@Service
@Slf4j
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryLogRepository inventoryLogRepository;
    private final MaterialRepository materialRepository;

    @Override
    @Transactional
    public void loadStock(StockOperationRequestDto requestDto) {
        log.info("Loading stock for material ID: {}", requestDto.getMaterialId());

        Material material = materialRepository.findById(requestDto.getMaterialId())
                .orElseThrow(() -> {
                    log.error("Material not found for ID: {}", requestDto.getMaterialId());
                    return new ResourceNotFoundException("Material not found");
                });

        InventoryLog logEntry = new InventoryLog();
        logEntry.setMaterial(material);
        logEntry.setTransactionDate(LocalDate.now());
        logEntry.setQtyIn(requestDto.getAmount());
        logEntry.setQtyOut(BigDecimal.ZERO);
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());

        // Note: You would calculate opening/closing stock here based on previous
        // records
        inventoryLogRepository.save(logEntry);

        log.info("Stock loaded successfully for material ID: {}", requestDto.getMaterialId());
    }

    @Override
    @Transactional
    public void deductStock(StockOperationRequestDto requestDto) {
        if (requestDto.getAmount() == null || requestDto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Invalid deduct amount: {}", requestDto.getAmount());
            return;
        }

        log.info("Deducting stock for material: {}", requestDto.getMaterialName());

        Material material = materialRepository.findById(requestDto.getMaterialId())
                .orElseThrow(() -> {
                    log.error("Material {} not found in DB", requestDto.getMaterialName());
                    return new ResourceNotFoundException(
                            "Material " + requestDto.getMaterialName() + " not found in DB");
                });

        InventoryLog logEntry = new InventoryLog();
        logEntry.setMaterial(material);
        logEntry.setTransactionDate(LocalDate.now());
        logEntry.setQtyIn(BigDecimal.ZERO);
        logEntry.setQtyOut(requestDto.getAmount());
        logEntry.setAuthorizedBy(requestDto.getAuthorizedBy());
        logEntry.setRemarks(requestDto.getRemarks());

        inventoryLogRepository.save(logEntry);
        log.info("Stock deducted successfully for material: {}", requestDto.getMaterialName());
    }
}
