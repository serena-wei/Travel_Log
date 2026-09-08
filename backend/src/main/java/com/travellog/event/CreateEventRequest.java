package com.travellog.event;

import java.time.LocalDateTime;

import com.travellog.common.ApiMessages;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateEventRequest {

	@NotBlank
	@Size(max = 200)
	private String title;

	@Size(max = 5000)
	private String description;

	@NotNull
	private LocalDateTime startAt;

	private LocalDateTime endAt;

	@AssertTrue(message = ApiMessages.TIME_RANGE_INVALID)
	public boolean isTimeRangeValid() {
		if (startAt == null || endAt == null) {
			return true;
		}
		return !endAt.isBefore(startAt);
	}
}
