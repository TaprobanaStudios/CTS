package com.taprobanastudios.main.config;

import com.taprobanastudios.main.model.Item;
import com.taprobanastudios.main.model.enums.UnitOfMeasure;
import com.taprobanastudios.main.repository.ItemRepository;
import com.taprobanastudios.main.service.EditHistoryService;
import com.taprobanastudios.main.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
@Slf4j
@RequiredArgsConstructor
public class DataInitializer {

    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final EditHistoryService editHistoryService;

    @Bean
    public CommandLineRunner initDefaultMaterials() {
        return args -> {
            log.info("Checking and initializing default materials...");
            List<String> defaultMaterials = Arrays.asList(
                    "Cement",
                    "Quarry Dust",
                    "River Sand",
                    "1/2 Metal",
                    "3/4 Metal"
            );

            for (String material : defaultMaterials) {
                if (!itemRepository.existsByName(material)) {
                    Item item = new Item();
                    item.setName(material);
                    item.setUnitOfMeasure(material.equals("Cement") ? UnitOfMeasure.BAGS : UnitOfMeasure.CUBES);
                    item.setDefaultMaterial(true);
                    itemRepository.save(item);
                    log.info("Created default material: {}", material);
                }
            }

            inventoryService.backfillStockBatches();
            editHistoryService.backfillEarlierEdits();
        };
    }
}
