package com.travellog.event;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.NotFoundException;
import com.travellog.common.ValidationException;
import com.travellog.journey.Journey;
import com.travellog.journey.JourneyRepository;

@Service
public class EventService {

	private final EventRepository eventRepository;
	private final JourneyRepository journeyRepository;
	private final EventPhotoRepository eventPhotoRepository;
	private final EventPhotoService eventPhotoService;

	public EventService(
			EventRepository eventRepository,
			JourneyRepository journeyRepository,
			EventPhotoRepository eventPhotoRepository,
			EventPhotoService eventPhotoService) {
		this.eventRepository = eventRepository;
		this.journeyRepository = journeyRepository;
		this.eventPhotoRepository = eventPhotoRepository;
		this.eventPhotoService = eventPhotoService;
	}

	@Transactional
	public EventResponse createForCurrentUser(Long userId, Long journeyId, CreateEventRequest request) {
		Journey journey = requireOwnedJourney(userId, journeyId);
		validateWithinJourney(journey, request.getStartAt(), request.getEndAt());
		Event event = new Event();
		event.setJourney(journey);
		assignEditableFields(event, request.getTitle(), request.getDescription(), request.getStartAt(), request.getEndAt());
		Event saved = eventRepository.save(event);
		return EventResponse.from(saved, List.of());
	}

	@Transactional(readOnly = true)
	public List<EventResponse> listForCurrentUser(Long userId, Long journeyId) {
		requireOwnedJourney(userId, journeyId);
		List<Event> events = eventRepository.findByJourneyIdOrderByStartAtAsc(journeyId);
		if (events.isEmpty()) {
			return List.of();
		}
		List<Long> eventIds = events.stream().map(Event::getId).toList();
		Map<Long, List<EventPhoto>> photosByEventId = eventPhotoRepository
				.findByEventIdInOrderBySortOrderAscIdAsc(eventIds)
				.stream()
				.collect(Collectors.groupingBy(photo -> photo.getEvent().getId(), LinkedHashMap::new, Collectors.toList()));

		List<EventResponse> responses = new ArrayList<>(events.size());
		for (Event event : events) {
			List<EventPhotoResponse> photos = photosByEventId
					.getOrDefault(event.getId(), List.of())
					.stream()
					.map(eventPhotoService::toResponse)
					.toList();
			responses.add(EventResponse.from(event, photos));
		}
		return responses;
	}

	@Transactional(readOnly = true)
	public EventResponse getForCurrentUser(Long userId, Long journeyId, Long eventId) {
		requireOwnedJourney(userId, journeyId);
		Event event = requireEventInJourney(eventId, journeyId);
		List<EventPhotoResponse> photos = eventPhotoRepository
				.findByEventIdOrderBySortOrderAscIdAsc(eventId)
				.stream()
				.map(eventPhotoService::toResponse)
				.toList();
		return EventResponse.from(event, photos);
	}

	@Transactional
	public EventResponse updateForCurrentUser(
			Long userId,
			Long journeyId,
			Long eventId,
			UpdateEventRequest request) {
		Journey journey = requireOwnedJourney(userId, journeyId);
		validateWithinJourney(journey, request.getStartAt(), request.getEndAt());
		Event event = requireEventInJourney(eventId, journeyId);
		assignEditableFields(event, request.getTitle(), request.getDescription(), request.getStartAt(), request.getEndAt());
		Event saved = eventRepository.save(event);
		List<EventPhotoResponse> photos = eventPhotoRepository
				.findByEventIdOrderBySortOrderAscIdAsc(eventId)
				.stream()
				.map(eventPhotoService::toResponse)
				.toList();
		return EventResponse.from(saved, photos);
	}

	@Transactional
	public void deleteForCurrentUser(Long userId, Long journeyId, Long eventId) {
		requireOwnedJourney(userId, journeyId);
		Event event = requireEventInJourney(eventId, journeyId);
		eventPhotoService.deleteStorageForEvent(eventId);
		eventRepository.delete(event);
	}

	private Journey requireOwnedJourney(Long userId, Long journeyId) {
		return journeyRepository.findByIdAndUserId(journeyId, userId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNEY_NOT_FOUND, ApiMessages.JOURNEY_NOT_FOUND));
	}

	private Event requireEventInJourney(Long eventId, Long journeyId) {
		return eventRepository.findByIdAndJourneyId(eventId, journeyId)
				.orElseThrow(() -> new NotFoundException(ErrorCode.EVENT_NOT_FOUND, ApiMessages.EVENT_NOT_FOUND));
	}

	private static void validateWithinJourney(Journey journey, LocalDateTime startAt, LocalDateTime endAt) {
		LocalDate journeyStart = journey.getStartDate();
		LocalDate journeyEnd = journey.getEndDate();
		Map<String, String> details = new LinkedHashMap<>();

		putDateBoundErrors(details, "startAt", startAt.toLocalDate(), journeyStart, journeyEnd);
		if (endAt != null) {
			putDateBoundErrors(details, "endAt", endAt.toLocalDate(), journeyStart, journeyEnd);
		}

		if (!details.isEmpty()) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, ApiMessages.VALIDATION_FAILED, details);
		}
	}

	private static void putDateBoundErrors(
			Map<String, String> details,
			String field,
			LocalDate eventDate,
			LocalDate journeyStart,
			LocalDate journeyEnd) {
		if (journeyStart != null && eventDate.isBefore(journeyStart)) {
			details.put(field, ApiMessages.EVENT_BEFORE_JOURNEY_START);
		}
		if (journeyEnd != null && eventDate.isAfter(journeyEnd)) {
			details.put(field, ApiMessages.EVENT_AFTER_JOURNEY_END);
		}
	}

	private static void assignEditableFields(
			Event event,
			String title,
			String description,
			LocalDateTime startAt,
			LocalDateTime endAt) {
		event.setTitle(title.trim());
		event.setDescription(trimToNull(description));
		event.setStartAt(startAt);
		event.setEndAt(endAt);
	}

	private static String trimToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}
}
