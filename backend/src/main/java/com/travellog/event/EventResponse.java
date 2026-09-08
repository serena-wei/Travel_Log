package com.travellog.event;

import java.time.Instant;
import java.time.LocalDateTime;

public record EventResponse(
		Long id,
		Long journeyId,
		String title,
		String description,
		LocalDateTime startAt,
		LocalDateTime endAt,
		Instant createdAt,
		Instant updatedAt
) {
	public static EventResponse from(Event event) {
		return new EventResponse(
				event.getId(),
				event.getJourney().getId(),
				event.getTitle(),
				event.getDescription(),
				event.getStartAt(),
				event.getEndAt(),
				event.getCreatedAt(),
				event.getUpdatedAt());
	}
}
