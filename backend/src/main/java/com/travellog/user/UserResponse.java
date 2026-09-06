package com.travellog.user;

public record UserResponse(
		Long id,
		String username,
		String email,
		String firstName,
		String lastName,
		String location,
		String description,
		UserRole role,
		boolean active
) {
	public static UserResponse from(User user) {
		return new UserResponse(
				user.getId(),
				user.getUsername(),
				user.getEmail(),
				user.getFirstName(),
				user.getLastName(),
				user.getLocation(),
				user.getDescription(),
				user.getRole(),
				user.isActive());
	}
}
