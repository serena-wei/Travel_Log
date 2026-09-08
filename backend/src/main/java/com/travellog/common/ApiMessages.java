package com.travellog.common;

public final class ApiMessages {

	public static final String AUTHENTICATION_REQUIRED = "Authentication required";
	public static final String INVALID_CREDENTIALS = "Invalid username or password";
	public static final String ACCOUNT_DISABLED = "Account is disabled";
	public static final String USERNAME_TAKEN = "Username is already taken";
	public static final String EMAIL_IN_USE = "Email is already in use";
	public static final String USER_NOT_FOUND = "User not found";
	public static final String JOURNEY_NOT_FOUND = "Journey not found";
	public static final String EVENT_NOT_FOUND = "Event not found";
	public static final String VALIDATION_FAILED = "Validation failed";
	public static final String UNEXPECTED_ERROR = "An unexpected error occurred";
	public static final String PASSWORDS_DO_NOT_MATCH = "Passwords do not match";
	public static final String PASSWORD_COMPLEXITY =
			"Password must include letters and numbers or symbols";
	public static final String DATE_RANGE_INVALID = "End date must be on or after start date";
	public static final String TIME_RANGE_INVALID = "End must be on or after start";
	public static final String EVENT_BEFORE_JOURNEY_START =
			"Must be on or after the journey start date";
	public static final String EVENT_AFTER_JOURNEY_END =
			"Must be on or before the journey end date";

	private ApiMessages() {
	}
}
