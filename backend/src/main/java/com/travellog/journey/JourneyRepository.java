package com.travellog.journey;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JourneyRepository extends JpaRepository<Journey, Long> {

	List<Journey> findByUserIdOrderByUpdatedAtDesc(Long userId);

	Optional<Journey> findByIdAndUserId(Long id, Long userId);

	@Query("""
			SELECT j FROM Journey j JOIN FETCH j.user
			WHERE j.visibility = :visibility
			ORDER BY j.updatedAt DESC
			""")
	List<Journey> findByVisibilityOrderByUpdatedAtDesc(@Param("visibility") JourneyVisibility visibility);

	@Query("""
			SELECT j FROM Journey j JOIN FETCH j.user
			WHERE j.id = :id
			""")
	Optional<Journey> findByIdWithUser(@Param("id") Long id);
}
