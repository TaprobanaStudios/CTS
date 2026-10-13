package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.ProductSaleDto;
import com.taprobanastudios.main.dto.ProductStockDto;
import com.taprobanastudios.main.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SalesController extends AbstractController {

    private final SalesService salesService;

    @GetMapping
    public ResponseEntity<List<ProductSaleDto>> getAllSales() {
        return sendSuccessResponse(salesService.getAllSales());
    }

    @PostMapping
    public ResponseEntity<ProductSaleDto> recordSale(@RequestBody ProductSaleDto saleDto) {
        return sendCreatedResponse(salesService.recordSale(saleDto));
    }

    @PutMapping("/{saleId}")
    public ResponseEntity<ProductSaleDto> updateSale(@PathVariable java.util.UUID saleId,
                                                     @RequestBody ProductSaleDto saleDto) {
        return sendUpdatedResponse(salesService.updateSale(saleId, saleDto));
    }

    // Stock and material cost of every manufactured product
    @GetMapping("/products")
    public ResponseEntity<List<ProductStockDto>> getProductStocks() {
        return sendSuccessResponse(salesService.getProductStocks());
    }
}
