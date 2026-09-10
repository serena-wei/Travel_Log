package com.travellog.user;

public record PresignAvatarResponse(
		String uploadUrl,
		String objectKey,
		String contentType
) {
}
