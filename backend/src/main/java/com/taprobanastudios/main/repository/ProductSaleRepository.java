package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.ProductSale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductSaleRepository extends JpaRepository<ProductSale, UUID> {
    List<ProductSale> findAllByOrderByCreatedAtDesc();
}
