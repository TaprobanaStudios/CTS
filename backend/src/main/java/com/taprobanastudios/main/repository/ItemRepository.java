package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface ItemRepository extends JpaRepository<Item, UUID> {
    
    @Query("SELECT DISTINCT i FROM Item i LEFT JOIN FETCH i.logs")
    List<Item> findAllWithLogs();
    
    Item findByName(String name);
    boolean existsByName(String name);
}
