package com.travellog.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import com.travellog.common.ApiMessages;
import com.travellog.common.ConflictException;
import com.travellog.common.ErrorCode;
import com.travellog.common.UnauthorizedException;
import com.travellog.common.ValidationException;
import com.travellog.security.JwtService;

@Service
public class UserAuthService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final UserProfileService userProfileService;

	public UserAuthService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			JwtService jwtService,
			UserProfileService userProfileService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.userProfileService = userProfileService;
	}

	@Transactional
	public UserResponse register(RegisterRequest request) {
		String username = request.getUsername().trim();
		String email = request.getEmail().trim().toLowerCase();

		if (userRepository.existsByUsername(username)) {
			throw new ConflictException(ErrorCode.USERNAME_TAKEN, ApiMessages.USERNAME_TAKEN);
		}
		if (userRepository.existsByEmailIgnoreCase(email)) {
			throw new ConflictException(ErrorCode.EMAIL_IN_USE, ApiMessages.EMAIL_IN_USE);
		}

		User user = new User();
		user.setUsername(username);
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
		user.setFirstName(trimToNull(request.getFirstName()));
		user.setLastName(trimToNull(request.getLastName()));
		user.setLocation(trimToNull(request.getLocation()));
		user.setRole(UserRole.TRAVELLER);
		user.setActive(true);

		return userProfileService.toResponse(userRepository.save(user));
	}

	@Transactional(readOnly = true)
	public AuthResponse login(LoginRequest request) {
		String username = request.getUsername().trim();
		User user = userRepository.findByUsername(username)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.INVALID_CREDENTIALS,
						ApiMessages.INVALID_CREDENTIALS));

		if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
			throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS, ApiMessages.INVALID_CREDENTIALS);
		}

		if (!user.isActive()) {
			throw new UnauthorizedException(ErrorCode.ACCOUNT_DISABLED, ApiMessages.ACCOUNT_DISABLED);
		}

		return AuthResponse.bearer(jwtService.generateToken(user), userProfileService.toResponse(user));
	}

	@Transactional
	public void changePassword(Long userId, ChangePasswordRequest request) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.UNAUTHORIZED,
						ApiMessages.AUTHENTICATION_REQUIRED));

		if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
			throw new ValidationException(
					ErrorCode.CURRENT_PASSWORD_INCORRECT,
					ApiMessages.CURRENT_PASSWORD_INCORRECT,
					Map.of("currentPassword", ApiMessages.CURRENT_PASSWORD_INCORRECT));
		}

		if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
			throw new ValidationException(
					ErrorCode.VALIDATION_FAILED,
					ApiMessages.NEW_PASSWORD_SAME_AS_CURRENT,
					Map.of("newPassword", ApiMessages.NEW_PASSWORD_SAME_AS_CURRENT));
		}

		user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
		userRepository.save(user);
	}

	private static String trimToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}
}
