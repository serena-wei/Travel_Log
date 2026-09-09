package com.travellog.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.EnabledIfDockerAvailable;

import com.travellog.TestcontainersConfiguration;
import com.travellog.event.EventRepository;
import com.travellog.journey.JourneyRepository;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class RegisterIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JourneyRepository journeyRepository;

	@Autowired
	private EventRepository eventRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void setUp() {
		eventRepository.deleteAll();
		journeyRepository.deleteAll();
		userRepository.deleteAll();
	}

	@Test
	void registerCreatesTravellerWithHashedPassword() throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "alice",
								  "email": "Alice@Example.com",
								  "password": "Secret123",
								  "confirmPassword": "Secret123",
								  "firstName": "Alice",
								  "location": "Auckland"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.username").value("alice"))
				.andExpect(jsonPath("$.email").value("alice@example.com"))
				.andExpect(jsonPath("$.firstName").value("Alice"))
				.andExpect(jsonPath("$.location").value("Auckland"))
				.andExpect(jsonPath("$.role").value("TRAVELLER"))
				.andExpect(jsonPath("$.active").value(true))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist());

		User saved = userRepository.findByUsername("alice").orElseThrow();
		assertThat(saved.getPasswordHash()).isNotEqualTo("Secret123");
		assertThat(passwordEncoder.matches("Secret123", saved.getPasswordHash())).isTrue();
	}

	@Test
	void registerDuplicateUsernameReturnsConflict() throws Exception {
		registerUser("carol", "carol@example.com");

		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "carol",
								  "email": "carol2@example.com",
								  "password": "Secret123",
								  "confirmPassword": "Secret123"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
	}

	@Test
	void registerDuplicateEmailReturnsConflict() throws Exception {
		registerUser("dave", "dave@example.com");

		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "dave2",
								  "email": "DAVE@example.com",
								  "password": "Secret123",
								  "confirmPassword": "Secret123"
								}
								"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EMAIL_IN_USE"));
	}

	@Test
	void registerWeakPasswordReturnsBadRequest() throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "frank",
								  "email": "frank@example.com",
								  "password": "password",
								  "confirmPassword": "password"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	private void registerUser(String username, String email) throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "%s",
								  "email": "%s",
								  "password": "Secret123",
								  "confirmPassword": "Secret123"
								}
								""".formatted(username, email)))
				.andExpect(status().isCreated());
	}
}
