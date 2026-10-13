package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.InventoryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface InventoryLogRepository extends JpaRepository<InventoryLog, UUID>, JpaSpecificationExecutor<InventoryLog> {
    List<InventoryLog> findByItem_IdOrderByCreatedAtDesc(UUID itemId);
    List<InventoryLog> findAllByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = "item")
    Page<InventoryLog> findAll(Specification<InventoryLog> spec, Pageable pageable);

    @Query("SELECT COALESCE(SUM(COALESCE(l.qtyIn, 0) - COALESCE(l.qtyOut, 0)), 0) FROM InventoryLog l WHERE l.item.id = :itemId")
    BigDecimal sumCurrentStock(@Param("itemId") UUID itemId);

    // Stocks that still have quantity left, oldest first (the order they are used up in)
    @EntityGraph(attributePaths = "item")
    List<InventoryLog> findByRemainingQtyGreaterThanOrderByCreatedAtAsc(BigDecimal quantity);

    @EntityGraph(attributePaths = "item")
    List<InventoryLog> findByItem_IdAndRemainingQtyGreaterThanOrderByCreatedAtAsc(UUID itemId, BigDecimal quantity);

    long countByBatchCodeStartingWith(String prefix);

    List<InventoryLog> findByItem_Id(UUID itemId, Sort sort);

    // A stock's buying cost is copied onto every deduction taken from it
    @Modifying
    @Query("UPDATE InventoryLog l SET l.unitCost = :unitCost WHERE l.sourceBatch.id = :batchId")
    void updateUnitCostOfDeductions(@Param("batchId") UUID batchId, @Param("unitCost") BigDecimal unitCost);

    // ... and onto the production entries that used it
    @Modifying
    @Query("UPDATE ProductionMaterialUsage u SET u.unitCost = :unitCost WHERE u.batch.id = :batchId")
    void updateUnitCostOfProductionUsages(@Param("batchId") UUID batchId, @Param("unitCost") BigDecimal unitCost);

    // Loads recorded before stock IDs existed
    @EntityGraph(attributePaths = "item")
    List<InventoryLog> findByBatchCodeIsNullAndQtyInGreaterThanOrderByCreatedAtAsc(BigDecimal quantity);
}

