package com.travellog.event;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PresignPhotoRequest {

	@NotBlank
	@Size(max = 100)
	private String contentType;

	@NotNull
	@Min(1)
	@Max(EventPhotoService.MAX_PHOTO_BYTES)
	private Long sizeBytes;

	@Size(max = 255)
	private String fileName;
}
