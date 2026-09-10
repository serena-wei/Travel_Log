package com.travellog.user;

import com.travellog.security.SecurityConstants;

public record AuthResponse(
		String accessToken,
		String tokenType,
		UserResponse user
) {
	public static AuthResponse bearer(String accessToken, UserResponse user) {
		return new AuthResponse(accessToken, SecurityConstants.BEARER_TOKEN_TYPE, user);
	}
}
