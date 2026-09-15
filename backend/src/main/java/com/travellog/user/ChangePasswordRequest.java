package com.travellog.user;

import com.travellog.common.ApiMessages;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {

	@NotBlank
	@Size(max = 100)
	private String currentPassword;

	@NotBlank
	@Size(min = 8, max = 100)
	private String newPassword;

	@NotBlank
	private String confirmNewPassword;

	@AssertTrue(message = ApiMessages.PASSWORDS_DO_NOT_MATCH)
	public boolean isNewPasswordConfirmed() {
		if (newPassword == null || confirmNewPassword == null) {
			return false;
		}
		return newPassword.equals(confirmNewPassword);
	}

	@AssertTrue(message = ApiMessages.PASSWORD_COMPLEXITY)
	public boolean isNewPasswordMeetingComplexity() {
		if (newPassword == null) {
			return false;
		}
		boolean hasLetter = newPassword.chars().anyMatch(Character::isLetter);
		boolean hasDigitOrSymbol = newPassword.chars().anyMatch(ch -> !Character.isLetter(ch));
		return hasLetter && hasDigitOrSymbol;
	}
}
