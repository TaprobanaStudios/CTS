package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.InventoryFilterDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ItemRepositoryCustom {
    Page<CurrentInventoryDto> findCurrentInventory(InventoryFilterDto filter, Pageable pageable);
}
