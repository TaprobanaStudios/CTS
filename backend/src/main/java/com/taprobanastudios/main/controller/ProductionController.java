package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.DailyProductionReportDto;
import com.taprobanastudios.main.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



import com.taprobanastudios.main.dto.ProductionItemResponseDto;
import java.util.List;

@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class ProductionController extends AbstractController {

    private final ProductionService productionService;

    @GetMapping("/items")
    public ResponseEntity<List<ProductionItemResponseDto>> getAllProductionItems() {
        return sendSuccessResponse(productionService.getAllProductionItems());
    }

    @PostMapping("/report")
    public ResponseEntity<DailyProductionReportDto> saveProductionReport(@RequestBody DailyProductionReportDto reportDto) {
        DailyProductionReportDto savedReport = productionService.saveProductionReport(reportDto);
        return sendCreatedResponse(savedReport);
    }
}
