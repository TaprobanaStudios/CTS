package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.ProductSaleDto;
import com.taprobanastudios.main.dto.ProductStockDto;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import com.taprobanastudios.main.model.ProductSale;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.model.ProductionMaterialUsage;
import com.taprobanastudios.main.model.ProductionProductUsage;
import com.taprobanastudios.main.repository.ProductSaleRepository;
import com.taprobanastudios.main.repository.ProductionItemRepository;
import com.taprobanastudios.main.service.EditHistoryService;
import com.taprobanastudios.main.service.SalesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class SalesServiceImpl implements SalesService {

    private final ProductSaleRepository productSaleRepository;
    private final ProductionItemRepository productionItemRepository;
    private final EditHistoryService editHistoryService;

    @Override
    @Transactional
    public ProductSaleDto recordSale(ProductSaleDto saleDto) {
        String productName = saleDto.getProductName() != null ? saleDto.getProductName().trim() : "";
        if (productName.isEmpty()) {
            throw new BadRequestException("Product is required");
        }
        if (saleDto.getQuantity() == null || saleDto.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (saleDto.getUnitPrice() == null || saleDto.getUnitPrice().signum() < 0) {
            throw new BadRequestException("Selling price is required and cannot be negative");
        }

        ProductStockDto stock = getProductStocks().stream()
                .filter(product -> product.getProductName().equalsIgnoreCase(productName))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("No production recorded for product: " + productName));
        if (saleDto.getQuantity() > stock.getCurrentStock()) {
            throw new BadRequestException("Only " + stock.getCurrentStock() + " PCS of " + stock.getProductName()
                    + " is available in inventory, but " + saleDto.getQuantity() + " was asked for. Selling more than is "
                    + "available would make the product stock negative and affect balances and reports across the whole system.");
        }

        ProductSale sale = new ProductSale();
        sale.setSaleDate(saleDto.getSaleDate() != null ? saleDto.getSaleDate() : LocalDate.now());
        sale.setProductName(stock.getProductName());
        sale.setQuantity(saleDto.getQuantity());
        sale.setUnitPrice(saleDto.getUnitPrice());
        sale.setUnitMaterialCost(stock.getUnitMaterialCost());

        ProductSale saved = productSaleRepository.save(sale);
        log.info("Recorded sale of {} x {}", saved.getQuantity(), saved.getProductName());
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public ProductSaleDto updateSale(java.util.UUID saleId, ProductSaleDto saleDto) {
        ProductSale sale = productSaleRepository.findById(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found for ID: " + saleId));
        log.info("Updating sale {} of {}", saleId, sale.getProductName());

        if (saleDto.getEditedBy() == null || saleDto.getEditedBy().isBlank()) {
            throw new BadRequestException("Edited By is required");
        }
        if (saleDto.getQuantity() == null || saleDto.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (saleDto.getUnitPrice() == null || saleDto.getUnitPrice().signum() < 0) {
            throw new BadRequestException("Selling price is required and cannot be negative");
        }

        ChangeList changes = new ChangeList();
        changes.compare("Quantity (PCS)", sale.getQuantity(), saleDto.getQuantity());
        changes.compare("Selling price (Rs.)", sale.getUnitPrice(), saleDto.getUnitPrice());
        changes.compare("Sale date", sale.getSaleDate(),
                saleDto.getSaleDate() != null ? saleDto.getSaleDate() : sale.getSaleDate());
        if (changes.isEmpty()) {
            return mapToDto(sale);
        }

        // What can be sold now is what is in stock plus what this sale already took
        long inStock = getProductStocks().stream()
                .filter(product -> product.getProductName().equalsIgnoreCase(sale.getProductName()))
                .mapToLong(ProductStockDto::getCurrentStock)
                .findFirst().orElse(0);
        long available = inStock + sale.getQuantity();
        if (saleDto.getQuantity() > available) {
            throw new BadRequestException("Only " + inStock + " PCS more of " + sale.getProductName()
                    + " is available in inventory, so this sale can be at most " + available + " PCS. Selling more "
                    + "would make the product stock negative and affect balances and reports across the whole system.");
        }

        sale.setQuantity(saleDto.getQuantity());
        sale.setUnitPrice(saleDto.getUnitPrice());
        if (saleDto.getSaleDate() != null) {
            sale.setSaleDate(saleDto.getSaleDate());
        }
        sale.setEditedBy(saleDto.getEditedBy().trim());
        sale.setEditedAt(java.time.LocalDateTime.now());
        sale.setEditCount((sale.getEditCount() != null ? sale.getEditCount() : 0) + 1);
        sale.setEditNote(editHistoryService.record("SALE", sale.getId(), sale.getProductName(),
                sale.getEditedBy(), sale.getEditedAt(), changes.lines(), saleDto.getEditRemark()));
        return mapToDto(productSaleRepository.save(sale));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductSaleDto> getAllSales() {
        return productSaleRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductStockDto> getProductStocks() {
        Map<String, ProductStockDto> stocks = new LinkedHashMap<>();
        // Material cost and usable pieces of the productions that had costed materials
        Map<String, BigDecimal> costedMaterialCost = new LinkedHashMap<>();
        Map<String, Long> costedPieces = new LinkedHashMap<>();

        for (ProductionItem item : productionItemRepository.findAll()) {
            String name = item.getProductType() != null ? item.getProductType().trim() : "";
            if (name.isEmpty()) {
                continue;
            }
            long produced = item.getQtyProduced() != null ? item.getQtyProduced() : 0;
            long damages = item.getDamages() != null ? item.getDamages() : 0;
            ProductStockDto stock = stockOf(stocks, name);
            stock.setProduced(stock.getProduced() + produced);
            stock.setDamages(stock.getDamages() + damages);

            BigDecimal materialCost = null;
            for (ProductionMaterialUsage usage : item.getMaterialUsages()) {
                if (usage.getUnitCost() != null) {
                    BigDecimal cost = usage.getUnitCost().multiply(usage.getAmount());
                    materialCost = materialCost == null ? cost : materialCost.add(cost);
                }
            }
            if (materialCost != null) {
                costedMaterialCost.merge(key(name), materialCost, BigDecimal::add);
                costedPieces.merge(key(name), produced - damages, Long::sum);
            }

            for (ProductionProductUsage usage : item.getProductUsages()) {
                String usedName = usage.getProductName() != null ? usage.getProductName().trim() : "";
                if (!usedName.isEmpty() && usage.getAmount() != null) {
                    ProductStockDto used = stockOf(stocks, usedName);
                    used.setUsed(used.getUsed() + usage.getAmount());
                }
            }
        }

        for (ProductSale sale : productSaleRepository.findAll()) {
            ProductStockDto stock = stockOf(stocks, sale.getProductName());
            stock.setSold(stock.getSold() + sale.getQuantity());
        }

        List<ProductStockDto> result = new ArrayList<>(stocks.values());
        for (ProductStockDto stock : result) {
            stock.setCurrentStock(Math.max(0,
                    stock.getProduced() - stock.getDamages() - stock.getUsed() - stock.getSold()));
            Long pieces = costedPieces.get(key(stock.getProductName()));
            if (pieces != null && pieces > 0) {
                stock.setUnitMaterialCost(costedMaterialCost.get(key(stock.getProductName()))
                        .divide(BigDecimal.valueOf(pieces), 2, RoundingMode.HALF_UP));
            }
        }
        return result;
    }

    // Product names are matched without regard to case; the first spelling seen is the one shown
    private String key(String productName) {
        return productName.toLowerCase();
    }

    private ProductStockDto stockOf(Map<String, ProductStockDto> stocks, String productName) {
        return stocks.computeIfAbsent(key(productName), k -> {
            ProductStockDto stock = new ProductStockDto();
            stock.setProductName(productName);
            return stock;
        });
    }

    private ProductSaleDto mapToDto(ProductSale sale) {
        ProductSaleDto dto = new ProductSaleDto();
        dto.setId(sale.getId());
        dto.setSaleDate(sale.getSaleDate());
        dto.setProductName(sale.getProductName());
        dto.setQuantity(sale.getQuantity());
        dto.setUnitPrice(sale.getUnitPrice());
        dto.setUnitMaterialCost(sale.getUnitMaterialCost());
        dto.setEditedBy(sale.getEditedBy());
        dto.setEditedAt(sale.getEditedAt());
        dto.setEditCount(sale.getEditCount());
        dto.setEditNote(sale.getEditNote());
        return dto;
    }
}
