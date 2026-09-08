package com.travellog.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.EnabledIfDockerAvailable;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.travellog.TestcontainersConfiguration;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LoginIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		userRepository.deleteAll();
		register("alice", "alice@example.com", "Secret123");
	}

	@Test
	void loginReturnsAccessToken() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "alice",
								  "password": "Secret123"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isString())
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.user.username").value("alice"))
				.andExpect(jsonPath("$.user.role").value("TRAVELLER"));
	}

	@Test
	void loginWithWrongPasswordReturnsUnauthorized() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "alice",
								  "password": "WrongPass1"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void currentUserRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/v1/users/current"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void currentUserReturnsProfileWithValidToken() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		mockMvc.perform(get("/api/v1/users/current")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("alice"))
				.andExpect(jsonPath("$.email").value("alice@example.com"));
	}

	@Test
	void bannedUserCannotLogin() throws Exception {
		User user = userRepository.findByUsername("alice").orElseThrow();
		user.setActive(false);
		userRepository.save(user);

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "alice",
								  "password": "Secret123"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
	}

	private void register(String username, String email, String password) throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "%s",
								  "email": "%s",
								  "password": "%s",
								  "confirmPassword": "%s"
								}
								""".formatted(username, email, password, password)))
				.andExpect(status().isCreated());
	}

	private String loginAndGetToken(String username, String password) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "%s",
								  "password": "%s"
								}
								""".formatted(username, password)))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
		return body.get("accessToken").asText();
	}
}
