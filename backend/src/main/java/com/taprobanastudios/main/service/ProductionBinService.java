package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.ProductBinSummaryDto;
import com.taprobanastudios.main.dto.ProductionLedgerRowDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductionBinService {
    // The products on the bin card, by name, one page at a time
    Page<ProductBinSummaryDto> getProducts(String search, Pageable pageable);

    // One product's figures, or all products together when no product is given; includes this month's material cost
    ProductBinSummaryDto getSummary(String productName);

    // One page of a product's ledger (or of every product's). Prices are included for admins only.
    Page<ProductionLedgerRowDto> getLedger(String productName, String movement, String search, boolean newestFirst,
                                           Pageable pageable, boolean includePrices);
}
