package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.DashboardSummaryDto;

public interface DashboardService {
    DashboardSummaryDto getDashboardSummary(String period);
}
