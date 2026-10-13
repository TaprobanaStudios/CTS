package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.dto.CurrentInventoryDto;
import com.taprobanastudios.main.dto.InventoryFilterDto;
import com.taprobanastudios.main.exception.BadRequestException;
import com.taprobanastudios.main.model.enums.StockStatus;
import com.taprobanastudios.main.model.enums.UnitOfMeasure;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ItemRepositoryCustomImpl implements ItemRepositoryCustom {

    private static final String STOCK = "COALESCE(SUM(COALESCE(l.qtyIn, 0) - COALESCE(l.qtyOut, 0)), 0)";

    private static final String ITEM_UPDATED_AT = "COALESCE(i.modifiedAt, i.createdAt)";

    // Latest of the item's own audit timestamp and its most recent stock movement
    private static final String UPDATED_AT = "CASE"
            + " WHEN MAX(l.createdAt) IS NULL THEN " + ITEM_UPDATED_AT
            + " WHEN " + ITEM_UPDATED_AT + " IS NULL OR MAX(l.createdAt) > " + ITEM_UPDATED_AT + " THEN MAX(l.createdAt)"
            + " ELSE " + ITEM_UPDATED_AT + " END";

    private static final String FROM = " FROM Item i LEFT JOIN i.logs l";

    private static final String GROUP_BY =
            " GROUP BY i.id, i.name, i.unitOfMeasure, i.isDefaultMaterial, i.modifiedAt, i.createdAt";

    // Sort properties exposed by CurrentInventoryDto, mapped to the expression they sort on
    private static final Map<String, String> SORT_EXPRESSIONS = Map.of(
            "itemName", "LOWER(i.name)",
            "unitOfMeasure", "i.unitOfMeasure",
            "currentStock", STOCK,
            "updatedAt", UPDATED_AT);

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "updatedAt");

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<CurrentInventoryDto> findCurrentInventory(InventoryFilterDto filter, Pageable pageable) {
        Map<String, Object> params = new HashMap<>();
        String where = buildWhere(filter, params);
        String having = buildHaving(filter, params);

        TypedQuery<Object[]> query = entityManager.createQuery(
                "SELECT i.id, i.name, i.unitOfMeasure, " + STOCK + ", " + UPDATED_AT + ", i.isDefaultMaterial"
                        + FROM + where + GROUP_BY + having + buildOrderBy(pageable.getSort()),
                Object[].class);
        params.forEach(query::setParameter);
        if (pageable.isPaged()) {
            query.setFirstResult((int) pageable.getOffset());
            query.setMaxResults(pageable.getPageSize());
        }
        List<CurrentInventoryDto> content = query.getResultList().stream().map(this::mapRow).toList();

        if (pageable.isUnpaged()) {
            return new PageImpl<>(content, pageable, content.size());
        }

        TypedQuery<Long> countQuery = entityManager.createQuery(
                "SELECT COUNT(*) FROM (SELECT i.id AS id" + FROM + where + GROUP_BY + having + ") matched",
                Long.class);
        params.forEach(countQuery::setParameter);
        return new PageImpl<>(content, pageable, countQuery.getSingleResult());
    }

    private String buildWhere(InventoryFilterDto filter, Map<String, Object> params) {
        if (filter.getSearch() == null || filter.getSearch().isBlank()) {
            return "";
        }
        params.put("search", LikePatterns.contains(filter.getSearch()));
        return " WHERE LOWER(i.name) LIKE :search ESCAPE '" + LikePatterns.ESCAPE + "'";
    }

    private String buildHaving(InventoryFilterDto filter, Map<String, Object> params) {
        List<String> conditions = new ArrayList<>();
        if (filter.getStatus() != null) {
            switch (filter.getStatus()) {
                case DEPLETED -> conditions.add(STOCK + " <= 0");
                case LOW -> {
                    conditions.add(STOCK + " > 0");
                    conditions.add(STOCK + " <= :lowStockThreshold");
                }
                case HEALTHY -> conditions.add(STOCK + " > :lowStockThreshold");
            }
            if (filter.getStatus() != StockStatus.DEPLETED) {
                params.put("lowStockThreshold", StockStatus.LOW_STOCK_THRESHOLD);
            }
        }
        return conditions.isEmpty() ? "" : " HAVING " + String.join(" AND ", conditions);
    }

    private String buildOrderBy(Sort sort) {
        List<String> orders = new ArrayList<>();
        for (Sort.Order order : sort.isSorted() ? sort : DEFAULT_SORT) {
            String expression = SORT_EXPRESSIONS.get(order.getProperty());
            if (expression == null) {
                throw new BadRequestException("Cannot sort inventory by: " + order.getProperty());
            }
            orders.add(expression + (order.isAscending() ? " ASC" : " DESC") + " NULLS LAST");
        }
        // Stable tie-breakers so rows never shift between pages
        orders.add("LOWER(i.name) ASC");
        orders.add("i.id ASC");
        return " ORDER BY " + String.join(", ", orders);
    }

    private CurrentInventoryDto mapRow(Object[] row) {
        BigDecimal currentStock = row[3] instanceof BigDecimal stock ? stock : new BigDecimal(row[3].toString());
        return new CurrentInventoryDto(
                (UUID) row[0],
                (String) row[1],
                (UnitOfMeasure) row[2],
                currentStock,
                StockStatus.of(currentStock),
                (LocalDateTime) row[4],
                (Boolean) row[5]);
    }
}
