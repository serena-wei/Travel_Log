package com.travellog.event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {

	List<Event> findByJourneyIdOrderByStartAtAsc(Long journeyId);

	Optional<Event> findByIdAndJourneyId(Long id, Long journeyId);
}
