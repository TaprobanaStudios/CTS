package com.taprobanastudios.main.controller;

import com.taprobanastudios.main.dto.EditHistoryDto;
import com.taprobanastudios.main.service.EditHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class EditHistoryController extends AbstractController {

    private final EditHistoryService editHistoryService;

    @GetMapping
    public ResponseEntity<Page<EditHistoryDto>> getHistory(@RequestParam(required = false) String search,
                                                           Pageable pageable) {
        return sendSuccessResponse(editHistoryService.getHistory(search, pageable));
    }
}
