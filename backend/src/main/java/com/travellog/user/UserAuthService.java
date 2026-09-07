package com.travellog.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ConflictException;
import com.travellog.common.ErrorCode;
import com.travellog.common.UnauthorizedException;
import com.travellog.security.JwtService;

@Service
public class UserAuthService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public UserAuthService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			JwtService jwtService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional
	public UserResponse register(RegisterRequest request) {
		String username = request.getUsername().trim();
		String email = request.getEmail().trim().toLowerCase();

		if (userRepository.existsByUsername(username)) {
			throw new ConflictException(ErrorCode.USERNAME_TAKEN, "Username is already taken");
		}
		if (userRepository.existsByEmailIgnoreCase(email)) {
			throw new ConflictException(ErrorCode.EMAIL_IN_USE, "Email is already in use");
		}

		User user = new User();
		user.setUsername(username);
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
		user.setFirstName(blankToNull(request.getFirstName()));
		user.setLastName(blankToNull(request.getLastName()));
		user.setLocation(blankToNull(request.getLocation()));
		user.setRole(UserRole.TRAVELLER);
		user.setActive(true);

		return UserResponse.from(userRepository.save(user));
	}

	@Transactional(readOnly = true)
	public AuthResponse login(LoginRequest request) {
		String username = request.getUsername().trim();
		User user = userRepository.findByUsername(username)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.INVALID_CREDENTIALS,
						"Invalid username or password"));

		if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
			throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
		}

		if (!user.isActive()) {
			throw new UnauthorizedException(ErrorCode.ACCOUNT_BANNED, "Account is banned");
		}

		return AuthResponse.bearer(jwtService.generateToken(user), user);
	}

	@Transactional(readOnly = true)
	public UserResponse getCurrentUser(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.UNAUTHORIZED,
						"Authentication required"));
		return UserResponse.from(user);
	}

	private static String blankToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}
}
