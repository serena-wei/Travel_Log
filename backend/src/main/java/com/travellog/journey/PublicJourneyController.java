package com.travellog.journey;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.common.PageResponse;

@RestController
@RequestMapping("/api/v1/public/journeys")
public class PublicJourneyController {

	private final JourneyService journeyService;

	public PublicJourneyController(JourneyService journeyService) {
		this.journeyService = journeyService;
	}

	@GetMapping
	public PageResponse<JourneyResponse> list(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String query) {
		return journeyService.listPublic(page, size, query);
	}
}
