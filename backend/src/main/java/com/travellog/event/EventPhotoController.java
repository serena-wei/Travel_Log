package com.travellog.event;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/events/{eventId}/photos")
public class EventPhotoController {

	private final EventPhotoService eventPhotoService;

	public EventPhotoController(EventPhotoService eventPhotoService) {
		this.eventPhotoService = eventPhotoService;
	}

	@PostMapping("/presign")
	public ResponseEntity<PresignPhotoResponse> presign(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId,
			@Valid @RequestBody PresignPhotoRequest request) {
		PresignPhotoResponse response =
				eventPhotoService.createUploadUrl(principal.getUserId(), journeyId, eventId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping("/{photoId}/presign-replace")
	public PresignPhotoResponse presignReplace(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId,
			@PathVariable Long photoId,
			@Valid @RequestBody PresignPhotoRequest request) {
		return eventPhotoService.createReplaceUploadUrl(
				principal.getUserId(), journeyId, eventId, photoId, request);
	}

	@DeleteMapping("/{photoId}")
	public ResponseEntity<Void> delete(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long journeyId,
			@PathVariable Long eventId,
			@PathVariable Long photoId) {
		eventPhotoService.deleteForCurrentUser(principal.getUserId(), journeyId, eventId, photoId);
		return ResponseEntity.noContent().build();
	}
}
