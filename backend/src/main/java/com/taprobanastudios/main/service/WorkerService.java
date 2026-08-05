package com.taprobanastudios.main.service;

import com.taprobanastudios.main.dto.WorkerDto;
import java.util.List;
import java.util.UUID;

public interface WorkerService {
    WorkerDto createWorker(WorkerDto workerDto);
    WorkerDto updateWorker(UUID id, WorkerDto workerDtoDetails);
    WorkerDto getWorker(UUID id);
    List<WorkerDto> getAllWorkers();
    void deleteWorker(UUID id);
}
