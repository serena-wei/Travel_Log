package com.travellog.event;

import java.time.Instant;

public record EventPhotoResponse(
		Long id,
		String url,
		String contentType,
		long sizeBytes,
		int sortOrder,
		Instant createdAt
) {
}
