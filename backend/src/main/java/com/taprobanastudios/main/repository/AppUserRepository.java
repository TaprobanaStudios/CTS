package com.taprobanastudios.main.repository;

import com.taprobanastudios.main.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);

    List<AppUser> findAllByOrderByCreatedAtAsc();

    Optional<AppUser> findByWorkerId(UUID workerId);
}
