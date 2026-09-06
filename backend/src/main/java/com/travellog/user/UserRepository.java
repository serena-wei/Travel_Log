package com.travellog.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	boolean existsByUsername(String username);

	boolean existsByEmailIgnoreCase(String email);

	Optional<User> findByUsername(String username);
}
