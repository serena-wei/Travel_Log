package com.travellog.event;

import java.util.Collection;
import java.util.Collection;
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

	@Query("""
			select e.journey.id, p.objectKey
			from EventPhoto p
			join p.event e
			where e.journey.id in :journeyIds
			order by e.journey.id asc, e.startAt asc, p.sortOrder asc, p.id asc
			""")
	List<Object[]> findCoverObjectKeysByJourneyIds(@Param("journeyIds") Collection<Long> journeyIds);
}
