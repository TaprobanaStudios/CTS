package com.taprobanastudios.main.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

// One row per correction made to a saved record: who changed what, when, from what to what.
// Rows are only ever added, so the table is a complete trail for tracing an error back.
@Entity
@Table(name = "edit_history", indexes = @Index(name = "idx_edit_history_edited_at", columnList = "edited_at"))
@Getter
@Setter
public class EditHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "edited_at", nullable = false)
    private LocalDateTime editedAt;

    @Column(name = "edited_by", nullable = false)
    private String editedBy;

    // STOCK_LOAD, STOCK_DEDUCTION, PRODUCTION or SALE
    @Column(name = "record_type", nullable = false)
    private String recordType;

    @Column(name = "record_id", nullable = false)
    private UUID recordId;

    // What the record is, in words: "Cement · stock CEM-261013-01", "cobble 60 s cb · Oct 13"
    @Column(name = "record_label", nullable = false)
    private String recordLabel;

    // Every value that changed, as "Field: old → new", one per line
    @Column(name = "changes", columnDefinition = "TEXT", nullable = false)
    private String changes;

    // Why the correction was made, as typed by the person making it; null if none was given
    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;
}
