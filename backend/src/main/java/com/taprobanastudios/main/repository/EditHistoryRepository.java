package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.EditHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface EditHistoryRepository extends JpaRepository<EditHistory, UUID> {

    Page<EditHistory> findAllByOrderByEditedAtDesc(Pageable pageable);

    boolean existsByRecordId(UUID recordId);

    // pattern comes from LikePatterns.contains
    @Query("""
            SELECT h FROM EditHistory h
            WHERE LOWER(h.recordLabel) LIKE :pattern ESCAPE '!'
               OR LOWER(h.editedBy) LIKE :pattern ESCAPE '!'
               OR LOWER(h.changes) LIKE :pattern ESCAPE '!'
               OR LOWER(COALESCE(h.remark, '')) LIKE :pattern ESCAPE '!'
               OR LOWER(h.recordType) LIKE :pattern ESCAPE '!'
            ORDER BY h.editedAt DESC
            """)
    Page<EditHistory> search(@Param("pattern") String pattern, Pageable pageable);
}
