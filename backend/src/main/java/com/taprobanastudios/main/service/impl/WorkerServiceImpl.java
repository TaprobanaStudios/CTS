package com.taprobanastudios.main.service.impl;

import com.taprobanastudios.main.dto.WorkerDto;
import com.taprobanastudios.main.model.Worker;
import com.taprobanastudios.main.repository.WorkerRepository;
import com.taprobanastudios.main.service.WorkerService;
import com.taprobanastudios.main.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class WorkerServiceImpl implements WorkerService {

    private final WorkerRepository workerRepository;

    @Override
    @Transactional
    public WorkerDto createWorker(WorkerDto workerDto) {
        log.info("Creating new worker: {}", workerDto.getName());
        Worker worker = new Worker();
        worker.setName(workerDto.getName());
        worker.setStatus(workerDto.getStatus());
        
        Worker savedWorker = workerRepository.save(worker);
        return mapToDto(savedWorker);
    }

    @Override
    @Transactional
    public WorkerDto updateWorker(UUID id, WorkerDto workerDtoDetails) {
        log.info("Updating worker with id: {}", id);
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + id));

        worker.setName(workerDtoDetails.getName());
        worker.setStatus(workerDtoDetails.getStatus());
        
        Worker updatedWorker = workerRepository.save(worker);
        return mapToDto(updatedWorker);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkerDto getWorker(UUID id) {
        log.info("Fetching worker with id: {}", id);
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + id));
        return mapToDto(worker);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkerDto> getAllWorkers() {
        log.info("Fetching all workers");
        return workerRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteWorker(UUID id) {
        log.info("Deleting worker with id: {}", id);
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + id));
        workerRepository.delete(worker);
    }
    
    private WorkerDto mapToDto(Worker worker) {
        WorkerDto dto = new WorkerDto();
        dto.setId(worker.getId());
        dto.setName(worker.getName());
        dto.setStatus(worker.getStatus());
        return dto;
    }
}
