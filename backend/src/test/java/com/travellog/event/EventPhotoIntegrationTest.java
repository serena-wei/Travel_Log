package com.travellog.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
	void replacePresignUpdatesMetadataAndKeepsSortOrder() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		MvcResult first = mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 1000,
								  "fileName": "old.jpg"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		JsonNode firstBody = objectMapper.readTree(first.getResponse().getContentAsString());
		Long photoId = firstBody.get("photoId").asLong();
		String previousKey = firstBody.get("objectKey").asString();

		presign(token, journeyId, eventId);

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/" + photoId
						+ "/presign-replace")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/png",
								  "sizeBytes": 2048,
								  "fileName": "new.png"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoId").value(photoId.intValue()))
				.andExpect(jsonPath("$.contentType").value("image/png"))
				.andExpect(jsonPath("$.sortOrder").value(0))
				.andExpect(jsonPath("$.uploadUrl").isString())
				.andExpect(jsonPath("$.objectKey").isString())
				.andExpect(jsonPath("$.objectKey").value(not(previousKey)));

		EventPhoto replaced = eventPhotoRepository.findById(photoId).orElseThrow();
		assertThat(replaced.getContentType()).isEqualTo("image/png");
		assertThat(replaced.getSizeBytes()).isEqualTo(2048L);
		assertThat(replaced.getSortOrder()).isEqualTo(0);
		assertThat(eventPhotoRepository.countByEventId(eventId)).isEqualTo(2);
	}

	@Test
	void replaceMissingPhotoReturnsNotFound() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/999999/presign-replace")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 1000
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
	}

	@Test
	void deletePhotoRemovesRowAndResequencesSortOrder() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		Long firstId = presignAndGetId(token, journeyId, eventId);
		Long secondId = presignAndGetId(token, journeyId, eventId);
		Long thirdId = presignAndGetId(token, journeyId, eventId);

		mockMvc.perform(delete("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/" + secondId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNoContent());

		assertThat(eventPhotoRepository.findById(secondId)).isEmpty();
		assertThat(eventPhotoRepository.countByEventId(eventId)).isEqualTo(2);
		assertThat(eventPhotoRepository.findById(firstId).orElseThrow().getSortOrder()).isEqualTo(0);
		assertThat(eventPhotoRepository.findById(thirdId).orElseThrow().getSortOrder()).isEqualTo(1);
	}

	@Test
	void deleteMissingPhotoReturnsNotFound() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		Long journeyId = createJourney(token);
		Long eventId = createEvent(token, journeyId);

		mockMvc.perform(delete("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/999999")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
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
		presignAndGetId(token, journeyId, eventId);
	}

	private Long presignAndGetId(String token, Long journeyId, Long eventId) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/journeys/" + journeyId + "/events/" + eventId + "/photos/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/jpeg",
								  "sizeBytes": 1000,
								  "fileName": "shot.jpg"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("photoId").asLong();
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
