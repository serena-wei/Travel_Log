package com.travellog.journey;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/journeys")
public class JourneyController {

	private final JourneyService journeyService;

	public JourneyController(JourneyService journeyService) {
		this.journeyService = journeyService;
	}

	@PostMapping
	public ResponseEntity<JourneyResponse> create(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@Valid @RequestBody CreateJourneyRequest request) {
		JourneyResponse created = journeyService.createForCurrentUser(principal.getUserId(), request);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@GetMapping
	public List<JourneyResponse> list(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@RequestParam(required = false) String query) {
		return journeyService.listForCurrentUser(principal.getUserId(), query);
	}

	@GetMapping("/{id}")
	public JourneyResponse get(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long id) {
		return journeyService.getForCurrentUser(principal.getUserId(), id);
	}

	@PutMapping("/{id}")
	public JourneyResponse update(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long id,
			@Valid @RequestBody UpdateJourneyRequest request) {
		return journeyService.updateForCurrentUser(principal.getUserId(), id, request);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long id) {
		journeyService.deleteForCurrentUser(principal.getUserId(), id);
		return ResponseEntity.noContent().build();
	}
}
