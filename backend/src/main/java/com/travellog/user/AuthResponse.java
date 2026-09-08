package com.travellog.user;

import com.travellog.security.SecurityConstants;

public record AuthResponse(
		String accessToken,
		String tokenType,
		UserResponse user
) {
	public static AuthResponse bearer(String accessToken, User user) {
		return new AuthResponse(accessToken, SecurityConstants.BEARER_TOKEN_TYPE, UserResponse.from(user));
	}
}
