package com.travellog.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

	private final UserProfileService userProfileService;

	public UserController(UserProfileService userProfileService) {
		this.userProfileService = userProfileService;
	}

	@GetMapping("/current")
	public UserResponse getCurrentUser(@AuthenticationPrincipal TravelLogUserDetails principal) {
		return userProfileService.getCurrentUser(principal.getUserId());
	}

	@PatchMapping("/current")
	public UserResponse updateCurrentUser(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@Valid @RequestBody UpdateUserProfileRequest request) {
		return userProfileService.updateCurrentUser(principal.getUserId(), request);
	}

	@PostMapping("/current/avatar/presign")
	public ResponseEntity<PresignAvatarResponse> presignAvatar(
			@AuthenticationPrincipal TravelLogUserDetails principal,
			@Valid @RequestBody PresignAvatarRequest request) {
		PresignAvatarResponse response =
				userProfileService.createAvatarUploadUrl(principal.getUserId(), request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@DeleteMapping("/current/avatar")
	public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal TravelLogUserDetails principal) {
		userProfileService.deleteAvatar(principal.getUserId());
		return ResponseEntity.noContent().build();
	}
}
