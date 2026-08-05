package com.taprobanastudios.main.audit;

import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        /*
         * Authentication authentication =
         * SecurityContextHolder.getContext().getAuthentication(); if
         * (Objects.isNull(authentication) || !authentication.isAuthenticated() ||
         * authentication instanceof AnonymousAuthenticationToken ||
         * Objects.isNull(authentication.getName())) { return Optional.of("System"); }
         *
         * return Optional.of(authentication.getName());
         */

        return Optional.of("System");
    }

}
