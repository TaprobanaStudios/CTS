package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.EditHistoryDto;
import com.taprobanastudios.main.model.EditHistory;
import com.taprobanastudios.main.model.InventoryLog;
import com.taprobanastudios.main.model.ProductSale;
import com.taprobanastudios.main.model.ProductionItem;
import com.taprobanastudios.main.repository.InventoryLogRepository;
import com.taprobanastudios.main.repository.ProductSaleRepository;
import com.taprobanastudios.main.repository.ProductionItemRepository;
import com.taprobanastudios.main.repository.EditHistoryRepository;
import com.taprobanastudios.main.repository.LikePatterns;
import com.taprobanastudios.main.service.EditHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EditHistoryServiceImpl implements EditHistoryService {

    private final EditHistoryRepository editHistoryRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final ProductionItemRepository productionItemRepository;
    private final ProductSaleRepository productSaleRepository;

    @Override
    @Transactional
    public String record(String recordType, UUID recordId, String recordLabel, String editedBy,
                         LocalDateTime editedAt, List<String> changes, String remark) {
        String reason = remark != null && !remark.isBlank() ? remark.trim() : null;
        EditHistory history = new EditHistory();
        history.setRecordType(recordType);
        history.setRecordId(recordId);
        history.setRecordLabel(recordLabel);
        history.setEditedBy(editedBy);
        history.setEditedAt(editedAt);
        history.setChanges(String.join("\n", changes));
        history.setRemark(reason);
        editHistoryRepository.save(history);
        return reason != null ? reason : String.join("; ", changes);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EditHistoryDto> getHistory(String search, Pageable pageable) {
        // Always newest first; only the page and size of the request are used
        Pageable page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<EditHistory> result = search == null || search.isBlank()
                ? editHistoryRepository.findAllByOrderByEditedAtDesc(page)
                : editHistoryRepository.search(LikePatterns.contains(search), page);
        return result.map(history -> new EditHistoryDto(
                history.getId(),
                history.getEditedAt(),
                history.getEditedBy(),
                history.getRecordType(),
                history.getRecordId(),
                history.getRecordLabel(),
                List.of(history.getChanges().split("\n")),
                history.getRemark()));
    }

    // What the old values were is not known for these, only who edited and when
    private static final String EARLIER_EDIT = "Edited before the edit history was introduced; the old values were not recorded";

    @Override
    @Transactional
    public void backfillEarlierEdits() {
        for (InventoryLog entry : inventoryLogRepository.findAll()) {
            if (entry.getEditedAt() != null && !editHistoryRepository.existsByRecordId(entry.getId())) {
                boolean isLoad = entry.getQtyIn() != null && entry.getQtyIn().signum() > 0;
                InventoryLog stock = isLoad ? entry : entry.getSourceBatch();
                record(isLoad ? "STOCK_LOAD" : "STOCK_DEDUCTION", entry.getId(),
                        entry.getItem().getName() + (stock != null && stock.getBatchCode() != null ? " · stock " + stock.getBatchCode() : ""),
                        entry.getEditedBy(), entry.getEditedAt(), List.of(EARLIER_EDIT), null);
                entry.setEditCount(1);
            }
        }
        for (ProductionItem item : productionItemRepository.findAll()) {
            if (item.getEditedAt() != null && !editHistoryRepository.existsByRecordId(item.getId())) {
                record("PRODUCTION", item.getId(), item.getProductType(), item.getEditedBy(), item.getEditedAt(),
                        List.of(EARLIER_EDIT), null);
                item.setEditCount(1);
            }
        }
        for (ProductSale sale : productSaleRepository.findAll()) {
            if (sale.getEditedAt() != null && !editHistoryRepository.existsByRecordId(sale.getId())) {
                record("SALE", sale.getId(), sale.getProductName(), sale.getEditedBy(), sale.getEditedAt(),
                        List.of(EARLIER_EDIT), null);
                sale.setEditCount(1);
            }
        }
    }
}
