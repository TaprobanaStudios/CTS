package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.DailyProductionReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyProductionReportRepository extends JpaRepository<DailyProductionReport, Long> {
}
