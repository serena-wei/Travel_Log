package com.travellog.event;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.NotFoundException;
import com.travellog.journey.Journey;
import com.travellog.journey.JourneyRepository;

@Service
public class EventService {

	private final EventRepository eventRepository;
	private final JourneyRepository journeyRepository;

	public EventService(EventRepository eventRepository, JourneyRepository journeyRepository) {
		this.eventRepository = eventRepository;
		this.journeyRepository = journeyRepository;
	}

	@Transactional
	public EventResponse createForCurrentUser(Long userId, Long journeyId, CreateEventRequest request) {
		Journey journey = requireOwnedJourney(userId, journeyId);
		Event event = new Event();
		event.setJourney(journey);
		assignEditableFields(event, request.getTitle(), request.getDescription(), request.getStartAt(), request.getEndAt());
		return EventResponse.from(eventRepository.save(event));
	}

	@Transactional(readOnly = true)
	public List<EventResponse> listForCurrentUser(Long userId, Long journeyId) {
		requireOwnedJourney(userId, journeyId);
		return eventRepository.findByJourneyIdOrderByStartAtAsc(journeyId).stream()
				.map(EventResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public EventResponse getForCurrentUser(Long userId, Long journeyId, Long eventId) {
		requireOwnedJourney(userId, journeyId);
		return EventResponse.from(requireEventInJourney(eventId, journeyId));
	}

	@Transactional
	public EventResponse updateForCurrentUser(
			Long userId,
			Long journeyId,
			Long eventId,
			UpdateEventRequest request) {
		requireOwnedJourney(userId, journeyId);
		Event event = requireEventInJourney(eventId, journeyId);
		assignEditableFields(event, request.getTitle(), request.getDescription(), request.getStartAt(), request.getEndAt());
		return EventResponse.from(eventRepository.save(event));
	}

	@Transactional
	public void deleteForCurrentUser(Long userId, Long journeyId, Long eventId) {
		requireOwnedJourney(userId, journeyId);
		Event event = requireEventInJourney(eventId, journeyId);
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

	private static void assignEditableFields(
			Event event,
			String title,
			String description,
			java.time.LocalDateTime startAt,
			java.time.LocalDateTime endAt) {
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
