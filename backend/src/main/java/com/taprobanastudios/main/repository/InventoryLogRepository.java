package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.InventoryLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InventoryLogRepository extends JpaRepository<InventoryLog, UUID> {
    List<InventoryLog> findByItem_IdOrderByCreatedAtDesc(UUID itemId);
    List<InventoryLog> findAllByOrderByCreatedAtDesc();
}
