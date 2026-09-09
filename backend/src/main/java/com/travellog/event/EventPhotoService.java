package com.travellog.event;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
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

	/**
	 * Creates DB metadata first, then returns a short-lived PUT URL.
	 * If the client never uploads, the row can exist without an S3 object.
	 */
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

	/**
	 * Keeps the same photo id/sortOrder, points metadata at a new object key, and deletes the previous
	 * S3 object immediately. The replacement file appears only after the client PUTs to {@code uploadUrl}.
	 */
	@Transactional
	public PresignPhotoResponse createReplaceUploadUrl(
			Long userId,
			Long journeyId,
			Long eventId,
			Long photoId,
			PresignPhotoRequest request) {
		requireOwnedJourney(userId, journeyId);
		requireEventInJourney(eventId, journeyId);
		EventPhoto photo = requirePhotoInEvent(photoId, eventId);

		String contentType = normalizeContentType(request.getContentType());
		long sizeBytes = request.getSizeBytes();
		validateReplacementPhoto(contentType, sizeBytes);

		String previousObjectKey = photo.getObjectKey();
		String objectKey = buildObjectKey(userId, journeyId, eventId, contentType, request.getFileName());

		photo.setObjectKey(objectKey);
		photo.setContentType(contentType);
		photo.setSizeBytes(sizeBytes);
		EventPhoto saved = eventPhotoRepository.save(photo);

		objectStorage.deleteObject(previousObjectKey);

		String uploadUrl = objectStorage.createUploadUrl(
				objectKey,
				contentType,
				Duration.ofSeconds(s3Properties.uploadUrlExpirySeconds()));

		return new PresignPhotoResponse(
				saved.getId(),
				uploadUrl,
				objectKey,
				contentType,
				saved.getSortOrder());
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
	public void deleteForCurrentUser(Long userId, Long journeyId, Long eventId, Long photoId) {
		requireOwnedJourney(userId, journeyId);
		requireEventInJourney(eventId, journeyId);
		EventPhoto photo = requirePhotoInEvent(photoId, eventId);
		String objectKey = photo.getObjectKey();
		eventPhotoRepository.delete(photo);
		objectStorage.deleteObject(objectKey);
		resequenceSortOrders(eventId);
	}

	@Transactional
	public void deleteStorageForEvent(Long eventId) {
		for (EventPhoto photo : eventPhotoRepository.findByEventIdOrderBySortOrderAscIdAsc(eventId)) {
			objectStorage.deleteObject(photo.getObjectKey());
		}
	}

	/** Compact remaining photos to contiguous sortOrder values 0..n-1 after a delete. */
	private void resequenceSortOrders(Long eventId) {
		List<EventPhoto> remaining = eventPhotoRepository.findByEventIdOrderBySortOrderAscIdAsc(eventId);
		for (int i = 0; i < remaining.size(); i++) {
			remaining.get(i).setSortOrder(i);
		}
	}

	private void validateNewPhoto(Long eventId, String contentType, long sizeBytes) {
		Map<String, String> details = new LinkedHashMap<>();
		if (eventPhotoRepository.countByEventId(eventId) >= MAX_PHOTOS_PER_EVENT) {
			details.put("photos", ApiMessages.PHOTO_LIMIT_EXCEEDED);
		}
		putTypeAndSizeErrors(details, contentType, sizeBytes);
		if (!details.isEmpty()) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, ApiMessages.VALIDATION_FAILED, details);
		}
	}

	private void validateReplacementPhoto(String contentType, long sizeBytes) {
		Map<String, String> details = new LinkedHashMap<>();
		putTypeAndSizeErrors(details, contentType, sizeBytes);
		if (!details.isEmpty()) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, ApiMessages.VALIDATION_FAILED, details);
		}
	}

	private static void putTypeAndSizeErrors(Map<String, String> details, String contentType, long sizeBytes) {
		if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
			details.put("contentType", ApiMessages.PHOTO_TYPE_UNSUPPORTED);
		}
		if (sizeBytes > MAX_PHOTO_BYTES) {
			details.put("sizeBytes", ApiMessages.PHOTO_TOO_LARGE);
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

	private EventPhoto requirePhotoInEvent(Long photoId, Long eventId) {
		return eventPhotoRepository.findByIdAndEventId(photoId, eventId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.PHOTO_NOT_FOUND, ApiMessages.PHOTO_NOT_FOUND));
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
