package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.InventoryLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InventoryLogRepository extends JpaRepository<InventoryLog, UUID> {
}
