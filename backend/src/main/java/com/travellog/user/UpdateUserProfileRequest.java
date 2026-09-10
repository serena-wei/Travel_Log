package com.travellog.user;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserProfileRequest {

	@Size(max = 100)
	private String firstName;

	@Size(max = 100)
	private String lastName;

	@Size(max = 255)
	private String location;

	@Size(max = 5000)
	private String description;
}
