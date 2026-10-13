package com.taprobanastudios.main.repository;

public final class LikePatterns {

    public static final char ESCAPE = '!';

    private LikePatterns() {
    }

    // Case-insensitive "contains" pattern; compare against a lower-cased column using ESCAPE
    public static String contains(String value) {
        StringBuilder escaped = new StringBuilder("%");
        for (char c : value.trim().toLowerCase().toCharArray()) {
            if (c == ESCAPE || c == '%' || c == '_') {
                escaped.append(ESCAPE);
            }
            escaped.append(c);
        }
        return escaped.append('%').toString();
    }
}
