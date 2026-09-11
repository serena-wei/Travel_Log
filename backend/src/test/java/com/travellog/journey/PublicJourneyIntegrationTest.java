package com.travellog.journey;

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
import com.travellog.event.EventRepository;
import com.travellog.user.UserRepository;

import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicJourneyIntegrationTest {

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
	void listPublicReturnsOnlyPublicJourneysSortedByUpdatedAtDesc() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");

		createJourney(aliceToken, "Alice Private", "PRIVATE");
		Long alicePublicOlderId = createJourney(aliceToken, "Alice Public Older", "PUBLIC");
		Long bobPublicId = createJourney(bobToken, "Bob Public", "PUBLIC");

		mockMvc.perform(put("/api/v1/journeys/" + alicePublicOlderId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Alice Public Updated",
								  "visibility": "PUBLIC"
								}
								"""))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/public/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(10))
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.totalPages").value(1))
				.andExpect(jsonPath("$.content[0].id").value(alicePublicOlderId.intValue()))
				.andExpect(jsonPath("$.content[0].title").value("Alice Public Updated"))
				.andExpect(jsonPath("$.content[0].ownerUsername").value("alice"))
				.andExpect(jsonPath("$.content[1].id").value(bobPublicId.intValue()))
				.andExpect(jsonPath("$.content[1].ownerUsername").value("bob"));
	}

	@Test
	void listPublicSupportsPagination() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");

		for (int i = 1; i <= 12; i++) {
			createJourney(aliceToken, "Public " + i, "PUBLIC");
		}

		mockMvc.perform(get("/api/v1/public/journeys")
						.param("page", "0")
						.param("size", "10")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(10))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(10))
				.andExpect(jsonPath("$.totalElements").value(12))
				.andExpect(jsonPath("$.totalPages").value(2));

		mockMvc.perform(get("/api/v1/public/journeys")
						.param("page", "1")
						.param("size", "10")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.totalElements").value(12))
				.andExpect(jsonPath("$.totalPages").value(2));
	}

	@Test
	void listPublicFiltersByTitleOrDescriptionQuery() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");

		Long titleMatchId = createJourney(aliceToken, "Kyoto temples", "PUBLIC", null);
		Long descriptionMatchId = createJourney(aliceToken, "Spring break", "PUBLIC", "Walking around Kyoto Gion");
		createJourney(aliceToken, "Queenstown hike", "PUBLIC", "South Island trails");

		mockMvc.perform(get("/api/v1/public/journeys")
						.param("query", "kyoto")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.content[?(@.id == " + titleMatchId + ")]").exists())
				.andExpect(jsonPath("$.content[?(@.id == " + descriptionMatchId + ")]").exists());
	}

	@Test
	void otherUserCanReadPublicJourneyDetailWithEventsAndPhotos() throws Exception {
		String aliceToken = loginAndGetToken("alice", "Secret123");
		String bobToken = loginAndGetToken("bob", "Secret123");

		Long journeyId = createJourney(aliceToken, "Shared Trip", "PUBLIC");
		Long eventId = createEvent(aliceToken, journeyId, "Day hike", "2026-05-01T09:00:00");
		presignPhoto(aliceToken, journeyId, eventId);

		mockMvc.perform(get("/api/v1/journeys/" + journeyId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Shared Trip"))
				.andExpect(jsonPath("$.ownerUsername").value("alice"));

		mockMvc.perform(get("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(eventId.intValue()))
				.andExpect(jsonPath("$[0].photos.length()").value(1))
				.andExpect(jsonPath("$[0].photos[0].url").isString());
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
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asString();
	}

	private Long createJourney(String token, String title, String visibility) throws Exception {
		return createJourney(token, title, visibility, null);
	}

	private Long createJourney(String token, String title, String visibility, String description)
			throws Exception {
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

	private void presignPhoto(String token, Long journeyId, Long eventId) throws Exception {
		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 1024,
								  "fileName": "trail.jpg"
								}
								"""))
				.andExpect(status().isCreated());
	}
}
