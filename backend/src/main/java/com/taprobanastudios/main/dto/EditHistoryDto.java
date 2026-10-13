package com.taprobanastudios.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditHistoryDto {
    private UUID id;
    private LocalDateTime editedAt;
    private String editedBy;
    private String recordType;
    private UUID recordId;
    private String recordLabel;
    private List<String> changes;
    private String remark;
}
