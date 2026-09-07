package com.travellog.journey;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JourneyRepository extends JpaRepository<Journey, Long> {

	List<Journey> findByUserIdOrderByUpdatedAtDesc(Long userId);

	Optional<Journey> findByIdAndUserId(Long id, Long userId);
}
