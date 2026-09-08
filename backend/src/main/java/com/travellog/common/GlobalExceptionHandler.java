package com.travellog.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> details = new LinkedHashMap<>();
		for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
			details.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
		}
		return ResponseEntity.badRequest()
				.body(ApiError.of(
						HttpStatus.BAD_REQUEST.value(),
						"Bad Request",
						ErrorCode.VALIDATION_FAILED,
						ApiMessages.VALIDATION_FAILED,
						details));
	}

	@ExceptionHandler(ValidationException.class)
	public ResponseEntity<ApiError> handleValidationBusiness(ValidationException ex) {
		return ResponseEntity.badRequest()
				.body(ApiError.of(
						HttpStatus.BAD_REQUEST.value(),
						"Bad Request",
						ex.getCode(),
						ex.getMessage(),
						ex.getDetails()));
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<ApiError> handleConflict(ConflictException ex) {
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(ApiError.of(
						HttpStatus.CONFLICT.value(),
						"Conflict",
						ex.getCode(),
						ex.getMessage()));
	}

	@ExceptionHandler(UnauthorizedException.class)
	public ResponseEntity<ApiError> handleUnauthorized(UnauthorizedException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(ApiError.of(
						HttpStatus.UNAUTHORIZED.value(),
						"Unauthorized",
						ex.getCode(),
						ex.getMessage()));
	}

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.body(ApiError.of(
						HttpStatus.NOT_FOUND.value(),
						"Not Found",
						ex.getCode(),
						ex.getMessage()));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
		org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class)
				.error("Unhandled exception", ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiError.of(
						HttpStatus.INTERNAL_SERVER_ERROR.value(),
						"Internal Server Error",
						ErrorCode.INTERNAL_ERROR,
						ApiMessages.UNEXPECTED_ERROR));
	}
}
