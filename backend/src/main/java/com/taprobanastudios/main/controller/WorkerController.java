package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.WorkerDto;
import com.taprobanastudios.main.service.WorkerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import java.util.UUID;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController extends AbstractController {

    private final WorkerService workerService;

    @PostMapping
    public ResponseEntity<WorkerDto> createWorker(@RequestBody WorkerDto workerDto) {
        WorkerDto createdWorker = workerService.createWorker(workerDto);
        return sendCreatedResponse(createdWorker);
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkerDto> updateWorker(@PathVariable UUID id, @RequestBody WorkerDto workerDto) {
        WorkerDto updatedWorker = workerService.updateWorker(id, workerDto);
        return sendUpdatedResponse(updatedWorker);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkerDto> getWorker(@PathVariable UUID id) {
        WorkerDto workerDto = workerService.getWorker(id);
        return sendSuccessResponse(workerDto);
    }

    @GetMapping
    public ResponseEntity<List<WorkerDto>> getAllWorkers() {
        List<WorkerDto> workers = workerService.getAllWorkers();
        return sendSuccessResponse(workers);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorker(@PathVariable UUID id) {
        workerService.deleteWorker(id);
        return sendNoContentResponse();
    }
}
