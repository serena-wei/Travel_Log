package com.travellog.user;

public record AuthResponse(
		String accessToken,
		String tokenType,
		UserResponse user
) {
	public static AuthResponse bearer(String accessToken, User user) {
		return new AuthResponse(accessToken, "Bearer", UserResponse.from(user));
	}
}
