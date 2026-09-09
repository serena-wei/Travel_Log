package com.travellog.event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventPhotoRepository extends JpaRepository<EventPhoto, Long> {

	long countByEventId(Long eventId);

	Optional<EventPhoto> findByIdAndEventId(Long id, Long eventId);

	List<EventPhoto> findByEventIdOrderBySortOrderAscIdAsc(Long eventId);

	List<EventPhoto> findByEventIdInOrderBySortOrderAscIdAsc(List<Long> eventIds);

	@Query("select p.objectKey from EventPhoto p where p.event.journey.id = :journeyId")
	List<String> findObjectKeysByJourneyId(@Param("journeyId") Long journeyId);
}
