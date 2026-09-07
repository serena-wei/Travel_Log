package com.travellog.journey;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class JourneyIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JourneyRepository journeyRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		journeyRepository.deleteAll();
		userRepository.deleteAll();
		register("alice", "alice@example.com", "Secret123");
		register("bob", "bob@example.com", "Secret123");
	}

	@Test
	void createRequiresAuthentication() throws Exception {
		mockMvc.perform(post("/api/v1/journeys")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "South Island"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void createDefaultsToPrivateAndSetsTimestamps() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		MvcResult result = mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "South Island",
								  "description": "Road trip"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.title").value("South Island"))
				.andExpect(jsonPath("$.description").value("Road trip"))
				.andExpect(jsonPath("$.visibility").value("PRIVATE"))
				.andExpect(jsonPath("$.createdAt").isString())
				.andExpect(jsonPath("$.updatedAt").isString())
				.andReturn();

		JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
		org.assertj.core.api.Assertions.assertThat(body.get("createdAt").asString())
				.isEqualTo(body.get("updatedAt").asString());
	}

	@Test
	void listReturnsOnlyCurrentUserJourneysSortedByUpdatedAtDesc() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");

		Long olderId = createJourney(aliceToken, "Alice Old", null);
		Long newerId = createJourney(aliceToken, "Alice New", null);
		createJourney(bobToken, "Bob Trip", null);

		mockMvc.perform(put("/api/v1/journeys/" + olderId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Alice Old Updated"
								}
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].id").value(olderId.intValue()))
				.andExpect(jsonPath("$[0].title").value("Alice Old Updated"))
				.andExpect(jsonPath("$[1].id").value(newerId.intValue()))
				.andExpect(jsonPath("$[1].title").value("Alice New"));
	}

	@Test
	void getUpdateDeleteOwnJourney() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long id = createJourney(token, "Fiordland", "PRIVATE");

		mockMvc.perform(get("/api/v1/journeys/" + id)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Fiordland"));

		mockMvc.perform(put("/api/v1/journeys/" + id)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Fiordland Updated",
								  "description": "Milford Sound",
								  "startDate": "2026-01-10",
								  "endDate": "2026-01-20",
								  "visibility": "PUBLIC"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Fiordland Updated"))
				.andExpect(jsonPath("$.description").value("Milford Sound"))
				.andExpect(jsonPath("$.startDate").value("2026-01-10"))
				.andExpect(jsonPath("$.endDate").value("2026-01-20"))
				.andExpect(jsonPath("$.visibility").value("PUBLIC"));

		mockMvc.perform(delete("/api/v1/journeys/" + id)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/journeys/" + id)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));
	}

	@Test
	void cannotAccessAnotherUsersJourney() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");
		Long aliceJourneyId = createJourney(aliceToken, "Alice Only", null);

		mockMvc.perform(get("/api/v1/journeys/" + aliceJourneyId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));

		mockMvc.perform(put("/api/v1/journeys/" + aliceJourneyId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Hacked"
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));

		mockMvc.perform(delete("/api/v1/journeys/" + aliceJourneyId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));
	}

	@Test
	void rejectsInvalidDateRange() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Bad Dates",
								  "startDate": "2026-02-10",
								  "endDate": "2026-02-01"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
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
		return body.get("accessToken").asString();
	}

	private Long createJourney(String token, String title, String visibility) throws Exception {
		String payload = visibility == null
				? """
						{
						  "title": "%s"
						}
						""".formatted(title)
				: """
						{
						  "title": "%s",
						  "visibility": "%s"
						}
						""".formatted(title, visibility);

		MvcResult result = mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(payload))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}
}
