package com.taprobanastudios.main.service.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

// Collects "Field: old → new" lines for the values an edit actually changed
final class ChangeList {

    private final List<String> changes = new ArrayList<>();

    void compare(String field, Object oldValue, Object newValue) {
        String before = text(oldValue);
        String after = text(newValue);
        if (!Objects.equals(before, after)) {
            changes.add(field + ": " + before + " → " + after);
        }
    }

    boolean isEmpty() {
        return changes.isEmpty();
    }

    List<String> lines() {
        return changes;
    }

    // 60.00 and 60 are the same quantity; blank and missing are the same "nothing"
    private String text(Object value) {
        if (value == null) {
            return "-";
        }
        if (value instanceof BigDecimal number) {
            return number.stripTrailingZeros().toPlainString();
        }
        String text = value.toString().trim();
        return text.isEmpty() ? "-" : text;
    }
}
