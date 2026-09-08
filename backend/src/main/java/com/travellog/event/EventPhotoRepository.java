package com.travellog.event;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventPhotoRepository extends JpaRepository<EventPhoto, Long> {

	long countByEventId(Long eventId);

	List<EventPhoto> findByEventIdOrderBySortOrderAscIdAsc(Long eventId);

	List<EventPhoto> findByEventIdInOrderBySortOrderAscIdAsc(List<Long> eventIds);
}
