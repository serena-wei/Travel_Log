package com.travellog.journey;

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

import com.travellog.TestcontainersConfiguration;
import com.travellog.user.UserRepository;
import com.travellog.user.UserRole;

import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class HiddenPublicJourneyIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JourneyRepository journeyRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		journeyRepository.deleteAll();
		userRepository.deleteAll();
	}

	@Test
	void editorCanListHiddenPublicJourneysAndTravellerCannot() throws Exception {
		register("alice", "alice@example.com");
		register("bob", "bob@example.com");
		register("editor", "editor@example.com");
		promote("editor", UserRole.EDITOR);

		String aliceToken = login("alice");
		String bobToken = login("bob");
		String editorToken = login("editor");

		Long visibleId = createJourney(aliceToken, "Still public", "PUBLIC", null);
		Long hiddenId = createJourney(aliceToken, "Kyoto night", "PUBLIC", "Hidden from Explore");
		createJourney(aliceToken, "Private trip", "PRIVATE", null);

		mockMvc.perform(post("/api/v1/moderation/journeys/" + hiddenId + "/hide")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.hidden").value(true));

		mockMvc.perform(get("/api/v1/public/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].id").value(visibleId.intValue()));

		mockMvc.perform(get("/api/v1/moderation/journeys/hidden")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].id").value(hiddenId.intValue()))
				.andExpect(jsonPath("$.content[0].title").value("Kyoto night"))
				.andExpect(jsonPath("$.content[0].hidden").value(true))
				.andExpect(jsonPath("$.content[0].ownerUsername").value("alice"));

		mockMvc.perform(get("/api/v1/moderation/journeys/hidden")
						.param("query", "kyoto")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].id").value(hiddenId.intValue()));

		mockMvc.perform(get("/api/v1/moderation/journeys/hidden")
						.param("query", "missing")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(0));

		mockMvc.perform(get("/api/v1/moderation/journeys/hidden")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	@Test
	void adminCanListHiddenPublicJourneys() throws Exception {
		register("alice", "alice@example.com");
		register("admin", "admin@example.com");
		promote("admin", UserRole.ADMIN);

		String aliceToken = login("alice");
		String adminToken = login("admin");
		Long hiddenId = createJourney(aliceToken, "Moderated", "PUBLIC", null);

		mockMvc.perform(post("/api/v1/moderation/journeys/" + hiddenId + "/hide")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/moderation/journeys/hidden")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].id").value(hiddenId.intValue()))
				.andExpect(jsonPath("$.content[0].hidden").value(true));
	}

	private void register(String username, String email) throws Exception {
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

	private void promote(String username, UserRole role) {
		var user = userRepository.findByUsername(username).orElseThrow();
		user.setRole(role);
		userRepository.save(user);
	}

	private String login(String username) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "username": "%s",
								  "password": "Secret123"
								}
								""".formatted(username)))
				.andExpect(status().isOk())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asString();
	}

	private Long createJourney(String token, String title, String visibility, String description) throws Exception {
		String descriptionJson = description == null
				? ""
				: ",\n\"description\": \"%s\"".formatted(description);
		MvcResult result = mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "%s",
								  "visibility": "%s"%s
								}
								""".formatted(title, visibility, descriptionJson)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}
}
