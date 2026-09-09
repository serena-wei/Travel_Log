package com.travellog.event;

public record PresignPhotoResponse(
		Long photoId,
		String uploadUrl,
		String objectKey,
		String contentType,
		int sortOrder
) {
}
