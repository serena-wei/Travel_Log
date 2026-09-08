package com.travellog.event;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record EventResponse(
		Long id,
		Long journeyId,
		String title,
		String description,
		LocalDateTime startAt,
		LocalDateTime endAt,
		List<EventPhotoResponse> photos,
		Instant createdAt,
		Instant updatedAt
) {
	public static EventResponse from(Event event, List<EventPhotoResponse> photos) {
		return new EventResponse(
				event.getId(),
				event.getJourney().getId(),
				event.getTitle(),
				event.getDescription(),
				event.getStartAt(),
				event.getEndAt(),
				List.copyOf(photos),
				event.getCreatedAt(),
				event.getUpdatedAt());
	}
}
