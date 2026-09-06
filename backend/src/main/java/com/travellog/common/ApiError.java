package com.travellog.common;

import java.time.Instant;
import java.util.Map;

public record ApiError(
		Instant timestamp,
		int status,
		String error,
		ErrorCode code,
		String message,
		Map<String, String> details
) {
	public static ApiError of(int status, String error, ErrorCode code, String message) {
		return new ApiError(Instant.now(), status, error, code, message, Map.of());
	}

	public static ApiError of(
			int status,
			String error,
			ErrorCode code,
			String message,
			Map<String, String> details) {
		return new ApiError(Instant.now(), status, error, code, message, details);
	}
}
