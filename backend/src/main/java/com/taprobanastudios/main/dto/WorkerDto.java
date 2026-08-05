package com.taprobanastudios.main.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class WorkerDto {
    private UUID id;
    private String name;
    private String status;
}
