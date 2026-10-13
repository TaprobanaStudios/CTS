package com.taprobanastudios.main.model.enums;

public enum UserRole {
    // Sees and manages everything, including users
    ADMIN,
    // Records stock and production quantities; no sales, revenue, staff or edit history
    CLERK,
    // A staff member with no login: no account, no password, no access
    WORKER
}
