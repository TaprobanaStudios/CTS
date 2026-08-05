package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.DailyProductionReportDto;
import com.taprobanastudios.main.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class ProductionController extends AbstractController {

    private final ProductionService productionService;

    @PostMapping("/report")
    public ResponseEntity<DailyProductionReportDto> saveProductionReport(@RequestBody DailyProductionReportDto reportDto) {
        DailyProductionReportDto savedReport = productionService.saveProductionReport(reportDto);
        return sendCreatedResponse(savedReport);
    }
}
