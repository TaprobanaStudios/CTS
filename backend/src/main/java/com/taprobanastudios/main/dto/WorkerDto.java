package com.taprobanastudios.main.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class WorkerDto {
    private UUID id;
    private String name;
    private String status;
    private String contactNumber;
    private String nicNumber;
    private String address;
    private java.time.LocalDate startDate;
    // WORKER (no login) or CLERK; set by the system, not by the staff form
    private com.taprobanastudios.main.model.enums.UserRole role;
}
