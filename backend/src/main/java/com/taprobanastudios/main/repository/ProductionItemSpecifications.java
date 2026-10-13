package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.dto.ProductionFilterDto;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.model.enums.ProductionStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class ProductionItemSpecifications {

    private ProductionItemSpecifications() {
    }

    public static Specification<ProductionItem> matching(ProductionFilterDto filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("productType")),
                        LikePatterns.contains(filter.getSearch()),
                        LikePatterns.ESCAPE));
            }
            if (filter.getStatus() == ProductionStatus.STORED) {
                // Items saved before statuses existed have none and are reported as STORED
                predicates.add(cb.or(
                        cb.isNull(root.get("status")),
                        cb.equal(root.get("status"), ProductionStatus.STORED)));
            } else if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
