package com.travellog.journey;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/journeys")
public class PublicJourneyController {

	private final JourneyService journeyService;

	public PublicJourneyController(JourneyService journeyService) {
		this.journeyService = journeyService;
	}

	@GetMapping
	public List<JourneyResponse> list() {
		return journeyService.listPublic();
	}
}
