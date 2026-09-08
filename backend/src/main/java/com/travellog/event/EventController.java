package com.travellog.event;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/events")
public class EventController {

	private final EventService eventService;

	public EventController(EventService eventService) {
		this.eventService = eventService;
	}

	@PostMapping
	public ResponseEntity<EventResponse> create(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@Valid @RequestBody CreateEventRequest request) {
		EventResponse created = eventService.createForCurrentUser(principal.getUserId(), journeyId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@GetMapping
	public List<EventResponse> list(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId) {
		return eventService.listForCurrentUser(principal.getUserId(), journeyId);
	}

	@GetMapping("/{eventId}")
	public EventResponse get(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId) {
		return eventService.getForCurrentUser(principal.getUserId(), journeyId, eventId);
	}

	@PutMapping("/{eventId}")
	public EventResponse update(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId,
			@Valid @RequestBody UpdateEventRequest request) {
		return eventService.updateForCurrentUser(principal.getUserId(), journeyId, eventId, request);
	}

	@DeleteMapping("/{eventId}")
	public ResponseEntity<Void> delete(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId) {
		eventService.deleteForCurrentUser(principal.getUserId(), journeyId, eventId);
		return ResponseEntity.noContent().build();
	}
}
