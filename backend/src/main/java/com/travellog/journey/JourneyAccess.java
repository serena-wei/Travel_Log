package com.travellog.journey;

import org.springframework.stereotype.Component;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.NotFoundException;

@Component
public class JourneyAccess {

	private final JourneyRepository journeyRepository;

	public JourneyAccess(JourneyRepository journeyRepository) {
		this.journeyRepository = journeyRepository;
	}

	public Journey requireOwned(Long userId, Long journeyId) {
		return journeyRepository.findByIdAndUserId(journeyId, userId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND));
	}

	/**
	 * Owner can read any of their journeys; any authenticated user can read PUBLIC journeys.
	 * Private journeys belonging to others are indistinguishable from missing (404).
	 */
	public Journey requireReadable(Long userId, Long journeyId) {
		Journey journey = journeyRepository.findByIdWithUser(journeyId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND));
		if (journey.getUser().getId().equals(userId) || journey.getVisibility() == JourneyVisibility.PUBLIC) {
			return journey;
		}
		throw new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND);
	}
}
