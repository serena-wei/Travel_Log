package com.travellog.event;

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
import com.travellog.journey.JourneyRepository;
import com.travellog.user.UserRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventPhotoIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JourneyRepository journeyRepository;

	@Autowired
	private EventRepository eventRepository;

	@Autowired
	private EventPhotoRepository eventPhotoRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		eventPhotoRepository.deleteAll();
		eventRepository.deleteAll();
		journeyRepository.deleteAll();
		userRepository.deleteAll();
		register("alice", "alice@example.com", "Secret123");
	}

	@Test
	void presignCreatesPhotoMetadataAndUploadUrl() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 12345,
								  "fileName": "lake.jpg"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.photoId").isNumber())
				.andExpect(jsonPath("$.uploadUrl").isString())
				.andExpect(jsonPath("$.objectKey").isString())
				.andExpect(jsonPath("$.contentType").value("image/jpeg"))
				.andExpect(jsonPath("$.sortOrder").value(0));
	}

	@Test
	void rejectsMoreThanTenPhotos() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		for (int i = 0; i < 10; i++) {
			presign(token, journeyId, eventId);
		}

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/png",
								  "sizeBytes": 1000,
								  "fileName": "extra.png"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.details.photos").value("An event can have at most 10 photos"));
	}

	@Test
	void rejectsUnsupportedTypeAndTooLarge() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/gif",
								  "sizeBytes": 1000
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.details.contentType").value("Only JPEG, PNG, and WebP images are allowed"));

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 6000000
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	private void presign(String token, Long journeyId, Long eventId) throws Exception {
		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 1000,
								  "fileName": "shot.jpg"
								}
								"""))
				.andExpect(status().isCreated());
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

	private Long createJourney(String token) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/journeys")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "South Island"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}

	private Long createEvent(String token, Long journeyId) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Lake Tekapo",
								  "startAt": "2026-03-01T09:00:00"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
	}
}
