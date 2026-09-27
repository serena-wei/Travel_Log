package com.travellog.journey;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.common.PageResponse;
import com.travellog.security.TravelLogUserDetails;

@RestController
@RequestMapping("/api/v1/moderation/journeys")
public class JourneyModerationController {

	private final JourneyService journeyService;

	public JourneyModerationController(JourneyService journeyService) {
		this.journeyService = journeyService;
	}

	@GetMapping("/hidden")
	public PageResponse<JourneyResponse> listHidden(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String query) {
		return journeyService.listHiddenPublic(principal.getUserId(), page, size, query);
	}

	@PostMapping("/{id}/hide")
	public JourneyResponse hide(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long id) {
		return journeyService.hidePublicJourney(principal.getUserId(), id);
	}

	@PostMapping("/{id}/unhide")
	public JourneyResponse unhide(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@PathVariable Long id) {
		return journeyService.unhidePublicJourney(principal.getUserId(), id);
	}
}
