package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.EditHistoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface EditHistoryService {
    // Adds one history row for a correction; `changes` holds one "Field: old → new" per value changed.
    // Returns the note to keep on the record itself: the reason given, or else what was changed.
    String record(String recordType, UUID recordId, String recordLabel, String editedBy, LocalDateTime editedAt,
                  List<String> changes, String remark);

    Page<EditHistoryDto> getHistory(String search, Pageable pageable);

    // Adds a history row for entries that were corrected before the history table existed
    void backfillEarlierEdits();
}
