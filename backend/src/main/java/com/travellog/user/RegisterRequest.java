package com.travellog.user;

import com.travellog.common.ApiMessages;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

	@NotBlank
	@Size(min = 3, max = 50)
	private String username;

	@NotBlank
	@Email
	@Size(max = 255)
	private String email;

	@NotBlank
	@Size(min = 8, max = 100)
	private String password;

	@NotBlank
	private String confirmPassword;

	@Size(max = 100)
	private String firstName;

	@Size(max = 100)
	private String lastName;

	@Size(max = 255)
	private String location;

	@AssertTrue(message = ApiMessages.PASSWORDS_DO_NOT_MATCH)
	public boolean isPasswordConfirmed() {
		if (password == null || confirmPassword == null) {
			return false;
		}
		return password.equals(confirmPassword);
	}

	@AssertTrue(message = ApiMessages.PASSWORD_COMPLEXITY)
	public boolean meetsPasswordComplexity() {
		if (password == null) {
			return false;
		}
		boolean hasLetter = password.chars().anyMatch(Character::isLetter);
		boolean hasDigitOrSymbol = password.chars().anyMatch(ch -> !Character.isLetter(ch));
		return hasLetter && hasDigitOrSymbol;
	}
}
