package com.travellog.journey;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
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
	 * Owner can read any of their journeys.
	 * Other travellers can read PUBLIC journeys that are not hidden.
	 * Editors/admins can also read hidden PUBLIC journeys for moderation.
	 * Private journeys belonging to others are indistinguishable from missing (404).
	 */
	public Journey requireReadable(Long userId, Long journeyId) {
		Journey journey = journeyRepository.findByIdWithUser(journeyId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND));
		if (journey.getUser().getId().equals(userId)) {
			return journey;
		}
		if (journey.getVisibility() != JourneyVisibility.PUBLIC) {
			throw new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND);
		}
		if (!journey.isHidden() || isModerator()) {
			return journey;
		}
		throw new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND);
	}

	private static boolean isModerator() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null) {
			return false;
		}
		for (GrantedAuthority authority : authentication.getAuthorities()) {
			String value = authority.getAuthority();
			if ("ROLE_EDITOR".equals(value) || "ROLE_ADMIN".equals(value)) {
				return true;
			}
		}
		return false;
	}
}
