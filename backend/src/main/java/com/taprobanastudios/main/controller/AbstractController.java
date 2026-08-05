package com.taprobanastudios.main.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public abstract class AbstractController {

    protected <T> ResponseEntity<T> sendSuccessResponse(T response){
        return ResponseEntity.ok(response);
    }
    protected <T>ResponseEntity<T> sendCreatedResponse(T response) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    protected <T>ResponseEntity<T> sendUpdatedResponse(T response) {
        return ResponseEntity.ok(response);
    }
    protected ResponseEntity<Void> sendNoContentResponse() {
        return ResponseEntity.noContent().build();
    }
}
