package com.travellog.journey;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JourneyRepository extends JpaRepository<Journey, Long> {

	List<Journey> findByUserIdOrderByUpdatedAtDesc(Long userId);

	Optional<Journey> findByIdAndUserId(Long id, Long userId);

	@Query(
			value = """
					SELECT j FROM Journey j JOIN FETCH j.user
					WHERE j.visibility = :visibility
					ORDER BY j.updatedAt DESC
					""",
			countQuery = """
					SELECT count(j) FROM Journey j
					WHERE j.visibility = :visibility
					""")
	Page<Journey> findByVisibilityOrderByUpdatedAtDesc(
			@Param("visibility") JourneyVisibility visibility,
			Pageable pageable);

	@Query("""
			SELECT j FROM Journey j JOIN FETCH j.user
			WHERE j.id = :id
			""")
	Optional<Journey> findByIdWithUser(@Param("id") Long id);
}
