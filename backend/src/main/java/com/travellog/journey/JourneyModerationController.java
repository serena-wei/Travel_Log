package com.travellog.journey;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

@RestController
@RequestMapping("/api/v1/moderation/journeys")
public class JourneyModerationController {

	private final JourneyService journeyService;

	public JourneyModerationController(JourneyService journeyService) {
		this.journeyService = journeyService;
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
