package com.taprobanastudios.main.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * The production bin card, worked out in the database so that only one page of it travels.
 * A product's stock moves in three ways: it is produced (less damages), used to make another
 * product, or sold. Products are identified by name, ignoring case.
 */
@Repository
public class ProductionBinRepository {

    // Every movement of every product. "ord" keeps a day's sales after that day's production.
    private static final String MOVEMENTS = """
            WITH mv AS (
                SELECT 'PRODUCTION' AS type, pi.id AS source_id, 0 AS idx,
                       lower(trim(pi.product_type)) AS k, trim(pi.product_type) AS name,
                       r.report_date AS d, 0 AS ord, pi.created_at AS c,
                       coalesce(pi.qty_produced, 0) AS qty_in, 0 AS qty_out, coalesce(pi.damages, 0) AS damage,
                       r.worker_name AS worker, CAST(NULL AS varchar) AS used_for
                FROM production_items pi
                JOIN daily_production_reports r ON r.id = pi.report_id
                WHERE trim(pi.product_type) <> ''
                UNION ALL
                SELECT 'CONSUMPTION', pi.id,
                       CAST(row_number() OVER (PARTITION BY pi.id ORDER BY pu.created_at, pu.id) AS integer),
                       lower(trim(pu.product_name)), trim(pu.product_name),
                       r.report_date, 0, pi.created_at,
                       0, pu.amount, 0,
                       r.worker_name, pi.product_type
                FROM production_product_usages pu
                JOIN production_items pi ON pi.id = pu.production_item_id
                JOIN daily_production_reports r ON r.id = pi.report_id
                WHERE pu.amount > 0 AND trim(pu.product_name) <> ''
                UNION ALL
                SELECT 'SALE', s.id, 0,
                       lower(trim(s.product_name)), trim(s.product_name),
                       s.sale_date, 1, s.created_at,
                       0, s.quantity, 0,
                       CAST(NULL AS varchar), CAST(NULL AS varchar)
                FROM product_sales s
                WHERE trim(s.product_name) <> ''
            )
            """;

    // All-time totals, then the same four for one month
    private static final String TOTALS = """
            coalesce(sum(qty_in), 0), coalesce(sum(damage), 0),
            coalesce(sum(CASE WHEN type = 'CONSUMPTION' THEN qty_out ELSE 0 END), 0),
            coalesce(sum(CASE WHEN type = 'SALE' THEN qty_out ELSE 0 END), 0),
            coalesce(sum(CASE WHEN d >= :monthStart AND d < :monthEnd THEN qty_in ELSE 0 END), 0),
            coalesce(sum(CASE WHEN d >= :monthStart AND d < :monthEnd THEN damage ELSE 0 END), 0),
            coalesce(sum(CASE WHEN d >= :monthStart AND d < :monthEnd AND type = 'CONSUMPTION' THEN qty_out ELSE 0 END), 0),
            coalesce(sum(CASE WHEN d >= :monthStart AND d < :monthEnd AND type = 'SALE' THEN qty_out ELSE 0 END), 0)
            """;

    private static final String ESCAPE = " ESCAPE '" + LikePatterns.ESCAPE + "'";

    // The running balance is taken over every movement of a product before any filter is applied
    private static final String LEDGER = MOVEMENTS + """
            , bal AS (
                SELECT mv.*,
                       row_number() OVER (ORDER BY d, ord, c, source_id, idx) AS seq,
                       sum(qty_in - qty_out - damage) OVER (
                           PARTITION BY k ORDER BY d, ord, c, source_id, idx
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS closing
                FROM mv
            )
            """;

    private static final String LEDGER_WHERE = """
             FROM bal
             WHERE (:product = '' OR k = :product)
               AND (:movement = 'all'
                    OR (:movement = 'in' AND qty_in > 0)
                    OR (:movement = 'out' AND qty_out > 0)
                    OR (:movement = 'damage' AND damage > 0))
               AND (:search = ''
                    OR k LIKE :pattern""" + ESCAPE + """

                    OR lower(coalesce(worker, '')) LIKE :pattern""" + ESCAPE + """

                    OR lower(coalesce(used_for, '')) LIKE :pattern""" + ESCAPE + """

                    OR (type = 'PRODUCTION' AND EXISTS (
                            SELECT 1 FROM production_material_usages mu
                            JOIN items i ON i.id = mu.item_id
                            WHERE mu.production_item_id = bal.source_id
                              AND lower(i.name) LIKE :pattern""" + ESCAPE + """
            )))
            """;

    @PersistenceContext
    private EntityManager entityManager;

    /** One row per product: key, name, then the eight totals. Ordered by name. */
    @SuppressWarnings("unchecked")
    public List<Object[]> findProductTotals(String search, LocalDate monthStart, LocalDate monthEnd, int limit, long offset) {
        Query query = entityManager.createNativeQuery(MOVEMENTS
                + "SELECT k, min(name), " + TOTALS
                + " FROM mv WHERE (:search = '' OR k LIKE :pattern" + ESCAPE + ")"
                + " GROUP BY k ORDER BY k LIMIT :limit OFFSET :offset");
        bindSearch(query, search);
        return query.setParameter("monthStart", monthStart).setParameter("monthEnd", monthEnd)
                .setParameter("limit", limit).setParameter("offset", offset)
                .getResultList();
    }

    public long countProducts(String search) {
        Query query = entityManager.createNativeQuery(MOVEMENTS
                + "SELECT count(DISTINCT k) FROM mv WHERE (:search = '' OR k LIKE :pattern" + ESCAPE + ")");
        bindSearch(query, search);
        return ((Number) query.getSingleResult()).longValue();
    }

    /** The eight totals of one product, or of all products together when the key is empty. */
    public Object[] findTotals(String productKey, LocalDate monthStart, LocalDate monthEnd) {
        return (Object[]) entityManager.createNativeQuery(MOVEMENTS
                        + "SELECT min(name), " + TOTALS + " FROM mv WHERE (:product = '' OR k = :product)")
                .setParameter("product", productKey)
                .setParameter("monthStart", monthStart).setParameter("monthEnd", monthEnd)
                .getSingleResult();
    }

    /**
     * Cost of the materials used in one month: the total, whether any material had a cost at all,
     * and whether some production left a material without one (so the total is incomplete).
     */
    public Object[] findMaterialCost(String productKey, LocalDate monthStart, LocalDate monthEnd) {
        return (Object[]) entityManager.createNativeQuery("""
                        SELECT coalesce(sum(t.cost), 0),
                               coalesce(bool_or(t.costed > 0), false),
                               coalesce(bool_or(t.costed > 0 AND t.missing > 0), false)
                        FROM (
                            SELECT sum(mu.amount * mu.unit_cost) AS cost,
                                   count(mu.unit_cost) AS costed,
                                   count(*) - count(mu.unit_cost) AS missing
                            FROM production_material_usages mu
                            JOIN production_items pi ON pi.id = mu.production_item_id
                            JOIN daily_production_reports r ON r.id = pi.report_id
                            WHERE r.report_date >= :monthStart AND r.report_date < :monthEnd
                              AND (:product = '' OR lower(trim(pi.product_type)) = :product)
                            GROUP BY pi.id
                        ) t
                        """)
                .setParameter("product", productKey)
                .setParameter("monthStart", monthStart).setParameter("monthEnd", monthEnd)
                .getSingleResult();
    }

    /**
     * One page of the ledger: type, source id, index, product name, date, in, out, damage,
     * closing balance, worker, the product it was used for, and its position in time.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> findLedger(Map<String, String> filter, boolean newestFirst, int limit, long offset) {
        Query query = entityManager.createNativeQuery(LEDGER
                + "SELECT type, CAST(source_id AS varchar), idx, name, d, qty_in, qty_out, damage, closing, worker, used_for, seq "
                + LEDGER_WHERE
                + " ORDER BY seq " + (newestFirst ? "DESC" : "ASC") + " LIMIT :limit OFFSET :offset");
        bindLedgerFilter(query, filter);
        return query.setParameter("limit", limit).setParameter("offset", offset).getResultList();
    }

    public long countLedger(Map<String, String> filter) {
        Query query = entityManager.createNativeQuery(LEDGER + "SELECT count(*) " + LEDGER_WHERE);
        bindLedgerFilter(query, filter);
        return ((Number) query.getSingleResult()).longValue();
    }

    private void bindLedgerFilter(Query query, Map<String, String> filter) {
        query.setParameter("product", filter.get("product")).setParameter("movement", filter.get("movement"));
        bindSearch(query, filter.get("search"));
    }

    private void bindSearch(Query query, String search) {
        String text = search == null ? "" : search.trim();
        query.setParameter("search", text).setParameter("pattern", LikePatterns.contains(text));
    }
}
