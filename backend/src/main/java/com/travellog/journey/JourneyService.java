package com.travellog.journey;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.UnauthorizedException;
import com.travellog.event.EventPhotoService;
import com.travellog.storage.ObjectStorage;
import com.travellog.storage.S3Properties;
import com.travellog.user.User;
import com.travellog.user.UserRepository;

@Service
public class JourneyService {

	private final JourneyRepository journeyRepository;
	private final UserRepository userRepository;
	private final EventPhotoService eventPhotoService;
	private final JourneyAccess journeyAccess;
	private final ObjectStorage objectStorage;
	private final S3Properties s3Properties;

	public JourneyService(
			JourneyRepository journeyRepository,
			UserRepository userRepository,
			EventPhotoService eventPhotoService,
			JourneyAccess journeyAccess,
			ObjectStorage objectStorage,
			S3Properties s3Properties) {
		this.journeyRepository = journeyRepository;
		this.userRepository = userRepository;
		this.eventPhotoService = eventPhotoService;
		this.journeyAccess = journeyAccess;
		this.objectStorage = objectStorage;
		this.s3Properties = s3Properties;
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
		return toResponse(journeyRepository.save(journey), null);
	}

	@Transactional(readOnly = true)
	public List<JourneyResponse> listForCurrentUser(Long userId) {
		List<Journey> journeys = journeyRepository.findByUserIdOrderByUpdatedAtDesc(userId);
		return toResponses(journeys);
	}

	@Transactional(readOnly = true)
	public List<JourneyResponse> listPublic() {
		List<Journey> journeys =
				journeyRepository.findByVisibilityOrderByUpdatedAtDesc(JourneyVisibility.PUBLIC);
		return toResponses(journeys);
	}

	@Transactional(readOnly = true)
	public JourneyResponse getForCurrentUser(Long userId, Long journeyId) {
		Journey journey = journeyAccess.requireReadable(userId, journeyId);
		return toResponse(journey, eventPhotoService.resolveCoverDownloadUrl(journey.getId()));
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
		Journey saved = journeyRepository.save(journey);
		return toResponse(saved, eventPhotoService.resolveCoverDownloadUrl(saved.getId()));
	}

	@Transactional
	public void deleteForCurrentUser(Long userId, Long journeyId) {
		Journey journey = journeyAccess.requireOwned(userId, journeyId);
		eventPhotoService.deleteStorageForJourney(journeyId);
		journeyRepository.delete(journey);
	}

	private List<JourneyResponse> toResponses(List<Journey> journeys) {
		List<Long> ids = journeys.stream().map(Journey::getId).toList();
		Map<Long, String> covers = eventPhotoService.resolveCoverDownloadUrls(ids);
		return journeys.stream()
				.map(journey -> toResponse(journey, covers.get(journey.getId())))
				.toList();
	}

	private JourneyResponse toResponse(Journey journey, String coverImageUrl) {
		return JourneyResponse.from(journey, resolveOwnerAvatarUrl(journey.getUser()), coverImageUrl);
	}

	private String resolveOwnerAvatarUrl(User user) {
		if (user.getAvatarObjectKey() == null) {
			return null;
		}
		return objectStorage.createDownloadUrl(
				user.getAvatarObjectKey(),
				Duration.ofSeconds(s3Properties.downloadUrlExpirySeconds()));
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
