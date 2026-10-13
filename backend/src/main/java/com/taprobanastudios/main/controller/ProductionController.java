package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.DailyProductionReportDto;
import com.taprobanastudios.main.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



import com.taprobanastudios.main.dto.ProductionFilterDto;
import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import com.taprobanastudios.main.dto.ProductionItemUpdateDto;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class ProductionController extends AbstractController {

    private final ProductionService productionService;

    @GetMapping("/items")
    public ResponseEntity<?> getAllProductionItems(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            ProductionFilterDto filter,
            Pageable pageable) {
        // Without page/size the full list is returned (product stock is derived from it)
        if (page == null && size == null) {
            return sendSuccessResponse(productionService.getAllProductionItems());
        }
        return sendSuccessResponse(productionService.getProductionItems(filter, pageable));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ProductionItemResponseDto> updateProductionItem(
            @PathVariable java.util.UUID itemId,
            @RequestBody ProductionItemUpdateDto updateDto,
            org.springframework.security.core.Authentication authentication) {
        // Recorded as whoever is signed in, whatever the request says
        updateDto.setEditedBy(authentication.getName());
        return sendSuccessResponse(productionService.updateProductionItem(itemId, updateDto));
    }

    @PostMapping("/report")
    public ResponseEntity<DailyProductionReportDto> saveProductionReport(@RequestBody DailyProductionReportDto reportDto) {
        DailyProductionReportDto savedReport = productionService.saveProductionReport(reportDto);
        return sendCreatedResponse(savedReport);
    }
}
