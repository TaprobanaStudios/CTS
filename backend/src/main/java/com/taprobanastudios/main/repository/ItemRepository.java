package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface ItemRepository extends JpaRepository<Item, UUID>, ItemRepositoryCustom {

    @Query("SELECT DISTINCT i FROM Item i LEFT JOIN FETCH i.logs")
    List<Item> findAllWithLogs();

    @Query("SELECT COALESCE(SUM(COALESCE(l.qtyIn, 0) - COALESCE(l.qtyOut, 0)), 0) FROM Item i LEFT JOIN i.logs l GROUP BY i.id")
    List<BigDecimal> findCurrentStockLevels();

    Item findByName(String name);
    boolean existsByName(String name);
}
