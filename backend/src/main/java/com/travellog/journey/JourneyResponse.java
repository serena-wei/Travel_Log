package com.travellog.journey;

import java.time.Instant;
import java.time.LocalDate;

public record JourneyResponse(
		Long id,
		Long ownerId,
		String ownerUsername,
		String title,
		String description,
		LocalDate startDate,
		LocalDate endDate,
		JourneyVisibility visibility,
		Instant createdAt,
		Instant updatedAt
) {
	public static JourneyResponse from(Journey journey) {
		return new JourneyResponse(
				journey.getId(),
				journey.getUser().getId(),
				journey.getUser().getUsername(),
				journey.getTitle(),
				journey.getDescription(),
				journey.getStartDate(),
				journey.getEndDate(),
				journey.getVisibility(),
				journey.getCreatedAt(),
				journey.getUpdatedAt());
	}
}
