package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.DailyProductionReportDto;

public interface ProductionService {
    DailyProductionReportDto saveProductionReport(DailyProductionReportDto reportDto);
}
