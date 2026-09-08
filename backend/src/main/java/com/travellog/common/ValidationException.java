package com.travellog.common;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ValidationException extends RuntimeException {

	private final ErrorCode code;
	private final Map<String, String> details;

	public ValidationException(ErrorCode code, String message, Map<String, String> details) {
		super(message);
		this.code = code;
		this.details = details;
	}

	public ErrorCode getCode() {
		return code;
	}

	public Map<String, String> getDetails() {
		return details;
	}
}
