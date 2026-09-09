package com.travellog.event;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.NotFoundException;
import com.travellog.common.ValidationException;
import com.travellog.journey.Journey;
import com.travellog.journey.JourneyRepository;
import com.travellog.storage.ObjectStorage;
import com.travellog.storage.S3Properties;

@Service
public class EventPhotoService {

	public static final int MAX_PHOTOS_PER_EVENT = 10;
	public static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;

	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
			"image/jpeg",
			"image/png",
			"image/webp");

	private final EventPhotoRepository eventPhotoRepository;
	private final EventRepository eventRepository;
	private final JourneyRepository journeyRepository;
	private final ObjectStorage objectStorage;
	private final S3Properties s3Properties;

	public EventPhotoService(
			EventPhotoRepository eventPhotoRepository,
			EventRepository eventRepository,
			JourneyRepository journeyRepository,
			ObjectStorage objectStorage,
			S3Properties s3Properties) {
		this.eventPhotoRepository = eventPhotoRepository;
		this.eventRepository = eventRepository;
		this.journeyRepository = journeyRepository;
		this.objectStorage = objectStorage;
		this.s3Properties = s3Properties;
	}

	@Transactional
	public PresignPhotoResponse createUploadUrl(
			Long userId,
			Long journeyId,
			Long eventId,
			PresignPhotoRequest request) {
		requireOwnedJourney(userId, journeyId);
		Event event = requireEventInJourney(eventId, journeyId);

		String contentType = normalizeContentType(request.getContentType());
		long sizeBytes = request.getSizeBytes();
		validateNewPhoto(event.getId(), contentType, sizeBytes);

		int sortOrder = (int) eventPhotoRepository.countByEventId(event.getId());
		String objectKey = buildObjectKey(userId, journeyId, eventId, contentType, request.getFileName());

		EventPhoto photo = new EventPhoto();
		photo.setEvent(event);
		photo.setObjectKey(objectKey);
		photo.setContentType(contentType);
		photo.setSizeBytes(sizeBytes);
		photo.setSortOrder(sortOrder);
		EventPhoto saved = eventPhotoRepository.save(photo);

		String uploadUrl = objectStorage.createUploadUrl(
				objectKey,
				contentType,
				Duration.ofSeconds(s3Properties.uploadUrlExpirySeconds()));

		return new PresignPhotoResponse(
				saved.getId(),
				uploadUrl,
				objectKey,
				contentType,
				sortOrder);
	}

	@Transactional(readOnly = true)
	public EventPhotoResponse toResponse(EventPhoto photo) {
		String url = objectStorage.createDownloadUrl(
				photo.getObjectKey(),
				Duration.ofSeconds(s3Properties.downloadUrlExpirySeconds()));
		return new EventPhotoResponse(
				photo.getId(),
				url,
				photo.getContentType(),
				photo.getSizeBytes(),
				photo.getSortOrder(),
				photo.getCreatedAt());
	}

	@Transactional
	public void deleteStorageForEvent(Long eventId) {
		for (EventPhoto photo : eventPhotoRepository.findByEventIdOrderBySortOrderAscIdAsc(eventId)) {
			objectStorage.deleteObject(photo.getObjectKey());
		}
	}

	private void validateNewPhoto(Long eventId, String contentType, long sizeBytes) {
		Map<String, String> details = new LinkedHashMap<>();
		if (eventPhotoRepository.countByEventId(eventId) >= MAX_PHOTOS_PER_EVENT) {
			details.put("photos", ApiMessages.PHOTO_LIMIT_EXCEEDED);
		}
		if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
			details.put("contentType", ApiMessages.PHOTO_TYPE_UNSUPPORTED);
		}
		if (sizeBytes > MAX_PHOTO_BYTES) {
			details.put("sizeBytes", ApiMessages.PHOTO_TOO_LARGE);
		}
		if (!details.isEmpty()) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, ApiMessages.VALIDATION_FAILED, details);
		}
	}

	private Journey requireOwnedJourney(Long userId, Long journeyId) {
		return journeyRepository.findByIdAndUserId(journeyId, userId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND));
	}

	private Event requireEventInJourney(Long eventId, Long journeyId) {
		return eventRepository.findByIdAndJourneyId(eventId, journeyId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.EVENT_NOT_FOUND, ApiMessages.EVENT_NOT_FOUND));
	}

	private static String normalizeContentType(String contentType) {
		return contentType.trim().toLowerCase(Locale.ROOT);
	}

	private static String buildObjectKey(
			Long userId,
			Long journeyId,
			Long eventId,
			String contentType,
			String fileName) {
		String extension = extensionFor(contentType, fileName);
		return "users/%d/journeys/%d/events/%d/%s%s"
				.formatted(userId, journeyId, eventId, UUID.randomUUID(), extension);
	}

	private static String extensionFor(String contentType, String fileName) {
		if (fileName != null && fileName.contains(".")) {
			String fromName = fileName.substring(fileName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
			if (fromName.matches("\\.(jpe?g|png|webp)")) {
				return fromName.equals(".jpeg") ? ".jpg" : fromName;
			}
		}
		return switch (contentType) {
			case "image/png" -> ".png";
			case "image/webp" -> ".webp";
			default -> ".jpg";
		};
	}
}
