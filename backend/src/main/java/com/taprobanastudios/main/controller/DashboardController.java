package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.DashboardSummaryDto;
import com.taprobanastudios.main.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> getSummary(@RequestParam(required = false, defaultValue = "month") String period) {
        return ResponseEntity.ok(dashboardService.getDashboardSummary(period));
    }
}
