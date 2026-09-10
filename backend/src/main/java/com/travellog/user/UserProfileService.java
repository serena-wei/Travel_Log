package com.travellog.user;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.travellog.common.ApiMessages;
import com.travellog.common.ErrorCode;
import com.travellog.common.UnauthorizedException;
import com.travellog.common.ValidationException;
import com.travellog.storage.ObjectStorage;
import com.travellog.storage.S3Properties;

@Service
public class UserProfileService {

	public static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;

	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
			"image/jpeg",
			"image/png",
			"image/webp");

	private final UserRepository userRepository;
	private final ObjectStorage objectStorage;
	private final S3Properties s3Properties;

	public UserProfileService(
			UserRepository userRepository,
			ObjectStorage objectStorage,
			S3Properties s3Properties) {
		this.userRepository = userRepository;
		this.objectStorage = objectStorage;
		this.s3Properties = s3Properties;
	}

	@Transactional(readOnly = true)
	public UserResponse getCurrentUser(Long userId) {
		return toResponse(requireUser(userId));
	}

	@Transactional
	public UserResponse updateCurrentUser(Long userId, UpdateUserProfileRequest request) {
		User user = requireUser(userId);
		user.setFirstName(trimToNull(request.getFirstName()));
		user.setLastName(trimToNull(request.getLastName()));
		user.setLocation(trimToNull(request.getLocation()));
		user.setDescription(trimToNull(request.getDescription()));
		return toResponse(userRepository.save(user));
	}

	/**
	 * Saves avatar metadata first, then returns a short-lived PUT URL.
	 * Replacing an existing avatar deletes the previous S3 object immediately.
	 */
	@Transactional
	public PresignAvatarResponse createAvatarUploadUrl(Long userId, PresignAvatarRequest request) {
		User user = requireUser(userId);

		String contentType = normalizeContentType(request.getContentType());
		long sizeBytes = request.getSizeBytes();
		validateAvatar(contentType, sizeBytes);

		String previousObjectKey = user.getAvatarObjectKey();
		String objectKey = buildObjectKey(userId, contentType, request.getFileName());

		user.setAvatarObjectKey(objectKey);
		user.setAvatarContentType(contentType);
		user.setAvatarSizeBytes(sizeBytes);
		userRepository.save(user);

		if (previousObjectKey != null) {
			objectStorage.deleteObject(previousObjectKey);
		}

		String uploadUrl = objectStorage.createUploadUrl(
				objectKey,
				contentType,
				Duration.ofSeconds(s3Properties.uploadUrlExpirySeconds()));

		return new PresignAvatarResponse(uploadUrl, objectKey, contentType);
	}

	@Transactional
	public void deleteAvatar(Long userId) {
		User user = requireUser(userId);
		String objectKey = user.getAvatarObjectKey();
		if (objectKey == null) {
			return;
		}
		user.setAvatarObjectKey(null);
		user.setAvatarContentType(null);
		user.setAvatarSizeBytes(null);
		userRepository.save(user);
		objectStorage.deleteObject(objectKey);
	}

	UserResponse toResponse(User user) {
		return UserResponse.from(user, resolveAvatarUrl(user));
	}

	private String resolveAvatarUrl(User user) {
		if (user.getAvatarObjectKey() == null) {
			return null;
		}
		return objectStorage.createDownloadUrl(
				user.getAvatarObjectKey(),
				Duration.ofSeconds(s3Properties.downloadUrlExpirySeconds()));
	}

	private User requireUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new UnauthorizedException(
						ErrorCode.UNAUTHORIZED,
						ApiMessages.AUTHENTICATION_REQUIRED));
	}

	private void validateAvatar(String contentType, long sizeBytes) {
		Map<String, String> details = new LinkedHashMap<>();
		if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
			details.put("contentType", ApiMessages.PHOTO_TYPE_UNSUPPORTED);
		}
		if (sizeBytes > MAX_AVATAR_BYTES) {
			details.put("sizeBytes", ApiMessages.AVATAR_TOO_LARGE);
		}
		if (!details.isEmpty()) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, ApiMessages.VALIDATION_FAILED, details);
		}
	}

	private static String normalizeContentType(String contentType) {
		return contentType.trim().toLowerCase(Locale.ROOT);
	}

	private static String buildObjectKey(Long userId, String contentType, String fileName) {
		String extension = extensionFor(contentType, fileName);
		return "users/%d/avatar/%s%s".formatted(userId, UUID.randomUUID(), extension);
	}

	private static String extensionFor(String contentType, String fileName) {
		if (fileName != null && fileName.contains(".")) {
			String fromName = fileName.substring(fileName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
			if (fromName.matches("\\.(jpe?g|png|webp)")) {
				return fromName.equals(".jpeg") ? ".jpg" : fromName;
			}
		}
		return switch (contentType) {
			case "image/png" -> ".png";
			case "image/webp" -> ".webp";
			default -> ".jpg";
		};
	}

	private static String trimToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}
}
