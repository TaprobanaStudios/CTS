package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;


@Entity
@Table(name = "production_items")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class ProductionItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private DailyProductionReport dailyProductionReport;

    @Column(name = "product_type", nullable = false)
    private String productType;

    @Column(name = "qty_produced")
    private Integer qtyProduced;

    @Column(name = "cement_used", precision = 10, scale = 2)
    private BigDecimal cementUsed;

    @Column(name = "qd_used", precision = 10, scale = 2)
    private BigDecimal qdUsed;

    @Column(name = "rs_used", precision = 10, scale = 2)
    private BigDecimal rsUsed;

    @Column(name = "half_m_used", precision = 10, scale = 2)
    private BigDecimal halfMUsed;

    @Column(name = "three_quarter_m_used", precision = 10, scale = 2)
    private BigDecimal threeQuarterMUsed;

    @Column(name = "damages")
    private Integer damages;
}