package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.ProductBinSummaryDto;
import com.taprobanastudios.main.dto.ProductionLedgerRowDto;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.service.ProductionBinService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// The production bin card, one page at a time. Open to clerks; sale prices are sent to admins only.
@RestController
@RequestMapping("/api/production/bin")
@RequiredArgsConstructor
public class ProductionBinController extends AbstractController {

    private static final int MAX_PAGE_SIZE = 100;

    private final ProductionBinService productionBinService;

    @GetMapping("/products")
    public ResponseEntity<Page<ProductBinSummaryDto>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        return sendSuccessResponse(productionBinService.getProducts(search, pageOf(page, size)));
    }

    // One product's figures, or all products together when "product" is left out
    @GetMapping("/summary")
    public ResponseEntity<ProductBinSummaryDto> getSummary(@RequestParam(required = false) String product) {
        return sendSuccessResponse(productionBinService.getSummary(product));
    }

    @GetMapping("/ledger")
    public ResponseEntity<Page<ProductionLedgerRowDto>> getLedger(
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String movement,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        return sendSuccessResponse(productionBinService.getLedger(product, movement, search,
                !"asc".equalsIgnoreCase(direction), pageOf(page, size), admin));
    }

    private Pageable pageOf(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page must be 0 or more and size between 1 and " + MAX_PAGE_SIZE);
        }
        return PageRequest.of(page, size);
    }
}
