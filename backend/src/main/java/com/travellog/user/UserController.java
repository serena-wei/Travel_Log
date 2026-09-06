package com.travellog.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.travellog.security.TravelLogUserDetails;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

	private final UserAuthService userAuthService;

	public UserController(UserAuthService userAuthService) {
		this.userAuthService = userAuthService;
	}

	@GetMapping("/current")
	public UserResponse getCurrentUser(@AuthenticationPrincipal TravelLogUserDetails principal) {
		return userAuthService.getCurrentUser(principal.getUsername());
	}
}
