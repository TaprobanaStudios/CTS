package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.ProductSaleDto;
import com.taprobanastudios.main.dto.ProductStockDto;

import java.util.List;

public interface SalesService {
    ProductSaleDto recordSale(ProductSaleDto saleDto);

    // Corrects the date, quantity or price of one sale and records who did it
    ProductSaleDto updateSale(java.util.UUID saleId, ProductSaleDto saleDto);

    List<ProductSaleDto> getAllSales();

    // The sales behind one page of a ledger
    List<ProductSaleDto> getSalesByIds(java.util.Collection<java.util.UUID> saleIds);

    List<ProductStockDto> getProductStocks();
}
