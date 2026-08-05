package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;


@Entity
@Table(name = "daily_production_reports")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class DailyProductionReport extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "worker_name", nullable = false)
    private String workerName;

    @OneToMany(mappedBy = "dailyProductionReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductionItem> productionItems;
}
