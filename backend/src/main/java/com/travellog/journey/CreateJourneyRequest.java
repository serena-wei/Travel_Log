package com.travellog.journey;

import java.time.LocalDate;

import com.travellog.common.ApiMessages;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateJourneyRequest {

	@NotBlank
	@Size(max = 200)
	private String title;

	@Size(max = 5000)
	private String description;

	private LocalDate startDate;

	private LocalDate endDate;

	private JourneyVisibility visibility;

	@AssertTrue(message = ApiMessages.DATE_RANGE_INVALID)
	public boolean isDateRangeValid() {
		if (startDate == null || endDate == null) {
			return true;
		}
		return !endDate.isBefore(startDate);
	}
}
