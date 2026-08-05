package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.ProductionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductionItemRepository extends JpaRepository<ProductionItem, UUID> {
    List<ProductionItem> findAllByOrderByCreatedAtDesc();
}
