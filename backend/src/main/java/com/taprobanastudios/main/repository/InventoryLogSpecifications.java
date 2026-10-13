package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.dto.InventoryLogFilterDto;
import com.taprobanastudios.main.model.InventoryLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class InventoryLogSpecifications {

    private InventoryLogSpecifications() {
    }

    // itemId == null matches the logs of every item
    public static Specification<InventoryLog> matching(UUID itemId, InventoryLogFilterDto filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (itemId != null) {
                predicates.add(cb.equal(root.get("item").get("id"), itemId));
            }
            if (filter.getMovement() != null) {
                String quantity = switch (filter.getMovement()) {
                    case IN -> "qtyIn";
                    case OUT -> "qtyOut";
                };
                predicates.add(cb.greaterThan(root.<BigDecimal>get(quantity), BigDecimal.ZERO));
            }
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String pattern = LikePatterns.contains(filter.getSearch());
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("remarks")), pattern, LikePatterns.ESCAPE),
                        cb.like(cb.lower(root.get("authorizedBy")), pattern, LikePatterns.ESCAPE),
                        cb.like(cb.lower(root.get("item").get("name")), pattern, LikePatterns.ESCAPE)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
