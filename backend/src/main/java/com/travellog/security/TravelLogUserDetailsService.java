package com.travellog.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.travellog.common.ApiMessages;
import com.travellog.user.UserRepository;

@Service
public class TravelLogUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	public TravelLogUserDetailsService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public TravelLogUserDetails loadUserById(Long userId) {
		return userRepository.findById(userId)
				.map(TravelLogUserDetails::new)
				.orElseThrow(() -> new UsernameNotFoundException(ApiMessages.USER_NOT_FOUND));
	}

	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		return userRepository.findByUsername(username)
				.map(TravelLogUserDetails::new)
				.orElseThrow(() -> new UsernameNotFoundException(ApiMessages.USER_NOT_FOUND));
	}
}
