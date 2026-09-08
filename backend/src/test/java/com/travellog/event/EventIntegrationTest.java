package com.travellog.event;

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
import com.travellog.journey.JourneyRepository;
import com.travellog.user.UserRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JourneyRepository journeyRepository;

	@Autowired
	private EventRepository eventRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		eventRepository.deleteAll();
		journeyRepository.deleteAll();
		userRepository.deleteAll();
		register("alice", "alice@example.com", "Secret123");
		register("bob", "bob@example.com", "Secret123");
	}

	@Test
	void createRequiresAuthentication() throws Exception {
		mockMvc.perform(post("/api/v1/journeys/1/events")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Flight",
								  "startAt": "2026-03-01T09:00:00"
								}
								"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void createListGetUpdateDeleteOwnEvents() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token, "South Island");

		MvcResult createResult = mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Flight NZ5373",
								  "description": "Wellington to Christchurch",
								  "startAt": "2026-03-01T09:00:00",
								  "endAt": "2026-03-01T10:20:00"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.journeyId").value(journeyId.intValue()))
				.andExpect(jsonPath("$.title").value("Flight NZ5373"))
				.andExpect(jsonPath("$.description").value("Wellington to Christchurch"))
				.andExpect(jsonPath("$.startAt").value("2026-03-01T09:00:00"))
				.andExpect(jsonPath("$.endAt").value("2026-03-01T10:20:00"))
				.andExpect(jsonPath("$.createdAt").isString())
				.andExpect(jsonPath("$.updatedAt").isString())
				.andReturn();

		Long eventId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

		createEvent(token, journeyId, "Dinner", "2026-03-01T19:00:00");
		createEvent(token, journeyId, "Museum", "2026-03-01T14:00:00");

		mockMvc.perform(get("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(3))
				.andExpect(jsonPath("$[0].title").value("Flight NZ5373"))
				.andExpect(jsonPath("$[1].title").value("Museum"))
				.andExpect(jsonPath("$[2].title").value("Dinner"));

		mockMvc.perform(get("/api/v1/journeys/" + journeyId + "/events/" + eventId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Flight NZ5373"));

		mockMvc.perform(put("/api/v1/journeys/" + journeyId + "/events/" + eventId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Flight NZ5373 Updated",
								  "description": null,
								  "startAt": "2026-03-01T08:45:00",
								  "endAt": "2026-03-01T10:05:00"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Flight NZ5373 Updated"))
				.andExpect(jsonPath("$.description").doesNotExist())
				.andExpect(jsonPath("$.startAt").value("2026-03-01T08:45:00"));

		mockMvc.perform(delete("/api/v1/journeys/" + journeyId + "/events/" + eventId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/journeys/" + journeyId + "/events/" + eventId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("EVENT_NOT_FOUND"));
	}

	@Test
	void cannotAccessAnotherUsersJourneyEvents() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");
		Long aliceJourneyId = createJourney(aliceToken, "Alice Only");
		Long eventId = createEvent(aliceToken, aliceJourneyId, "Private Event", "2026-04-01T12:00:00");

		mockMvc.perform(get("/api/v1/journeys/" + aliceJourneyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));

		mockMvc.perform(post("/api/v1/journeys/" + aliceJourneyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Hacked",
								  "startAt": "2026-04-02T10:00:00"
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));

		mockMvc.perform(get("/api/v1/journeys/" + aliceJourneyId + "/events/" + eventId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));
	}

	@Test
	void missingJourneyReturnsNotFound() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		mockMvc.perform(get("/api/v1/journeys/999999/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("JOURNEY_NOT_FOUND"));
	}

	@Test
	void rejectsInvalidTimeRange() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token, "Bad Dates", null, null);

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Impossible",
								  "startAt": "2026-03-01T18:00:00",
								  "endAt": "2026-03-01T10:00:00"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void rejectsEventOutsideJourneyDates() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token, "Dated Trip", "2026-03-10", "2026-03-20");

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Too early",
								  "startAt": "2026-03-01T09:00:00"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.details.startAt").value("Must be on or after the journey start date"));

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Too late",
								  "startAt": "2026-03-25T09:00:00"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.details.startAt").value("Must be on or before the journey end date"));
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

	private Long createJourney(String token, String title) throws Exception {
		return createJourney(token, title, null, null);
	}

	private Long createJourney(String token, String title, String startDate, String endDate) throws Exception {
		StringBuilder payload = new StringBuilder("""
				{
				  "title": "%s"
				""".formatted(title));
		if (startDate != null) {
			payload.append(",\n  \"startDate\": \"").append(startDate).append('"');
		}
		if (endDate != null) {
			payload.append(",\n  \"endDate\": \"").append(endDate).append('"');
		}
		payload.append("\n}");

		MvcResult result = mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(payload.toString()))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}

	private Long createEvent(String token, Long journeyId, String title, String startAt) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "%s",
								  "startAt": "%s"
								}
								""".formatted(title, startAt)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}
}
