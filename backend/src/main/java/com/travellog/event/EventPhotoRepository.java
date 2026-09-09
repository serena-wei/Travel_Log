package com.travellog.event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventPhotoRepository extends JpaRepository<EventPhoto, Long> {

	long countByEventId(Long eventId);

	Optional<EventPhoto> findByIdAndEventId(Long id, Long eventId);

	List<EventPhoto> findByEventIdOrderBySortOrderAscIdAsc(Long eventId);

	List<EventPhoto> findByEventIdInOrderBySortOrderAscIdAsc(List<Long> eventIds);
}
