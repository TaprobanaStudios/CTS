package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;
import com.taprobanastudios.main.audit.Auditable;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "production_product_usages")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
public class ProductionProductUsage extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_item_id", nullable = false)
    private ProductionItem productionItem;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "amount", nullable = false)
    private Integer amount;
}
