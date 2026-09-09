package com.travellog.journey;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.UnauthorizedException;
import com.travellog.event.EventPhotoService;
import com.travellog.user.User;
import com.travellog.user.UserRepository;

@Service
public class JourneyService {

	private final JourneyRepository journeyRepository;
	private final UserRepository userRepository;
	private final EventPhotoService eventPhotoService;
	private final JourneyAccess journeyAccess;

	public JourneyService(
			JourneyRepository journeyRepository,
			UserRepository userRepository,
			EventPhotoService eventPhotoService,
			JourneyAccess journeyAccess) {
		this.journeyRepository = journeyRepository;
		this.userRepository = userRepository;
		this.eventPhotoService = eventPhotoService;
		this.journeyAccess = journeyAccess;
	}

	@Transactional
	public JourneyResponse createForCurrentUser(Long userId, CreateJourneyRequest request) {
		User user = requireUser(userId);
		Journey journey = new Journey();
		journey.setUser(user);
		journey.setTitle(request.getTitle().trim());
		journey.setDescription(trimToNull(request.getDescription()));
		journey.setStartDate(request.getStartDate());
		journey.setEndDate(request.getEndDate());
		journey.setVisibility(request.getVisibility() == null
				? JourneyVisibility.PRIVATE
				: request.getVisibility());
		return JourneyResponse.from(journeyRepository.save(journey));
	}

	@Transactional(readOnly = true)
	public List<JourneyResponse> listForCurrentUser(Long userId) {
		return journeyRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
				.map(JourneyResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<JourneyResponse> listPublic() {
		return journeyRepository.findByVisibilityOrderByUpdatedAtDesc(JourneyVisibility.PUBLIC).stream()
				.map(JourneyResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public JourneyResponse getForCurrentUser(Long userId, Long journeyId) {
		return JourneyResponse.from(journeyAccess.requireReadable(userId, journeyId));
	}

	@Transactional
	public JourneyResponse updateForCurrentUser(Long userId, Long journeyId, UpdateJourneyRequest request) {
		Journey journey = journeyAccess.requireOwned(userId, journeyId);

		journey.setTitle(request.getTitle().trim());
		journey.setDescription(trimToNull(request.getDescription()));
		journey.setStartDate(request.getStartDate());
		journey.setEndDate(request.getEndDate());
		if (request.getVisibility() != null) {
			journey.setVisibility(request.getVisibility());
		}
		return JourneyResponse.from(journeyRepository.save(journey));
	}

	@Transactional
	public void deleteForCurrentUser(Long userId, Long journeyId) {
		Journey journey = journeyAccess.requireOwned(userId, journeyId);
		eventPhotoService.deleteStorageForJourney(journeyId);
		journeyRepository.delete(journey);
	}

	private User requireUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.UNAUTHORIZED,
						ApiMessages.AUTHENTICATION_REQUIRED));
	}

	private static String trimToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}
}
