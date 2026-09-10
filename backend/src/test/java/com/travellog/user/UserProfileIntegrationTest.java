package com.travellog.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.EnabledIfDockerAvailable;

import com.travellog.TestcontainersConfiguration;
import com.travellog.storage.FakeObjectStorage;
import com.travellog.storage.ObjectStorage;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfDockerAvailable
@SpringBootTest(properties = "travellog.s3.bucket=")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class UserProfileIntegrationTest {

	@DynamicPropertySource
	static void disableRealS3(DynamicPropertyRegistry registry) {
		registry.add("travellog.s3.bucket", () -> "");
	}

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ObjectStorage objectStorage;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		userRepository.deleteAll();
		fakeStorage().clearDeletedObjectKeys();
		register("alice", "alice@example.com", "Secret123");
	}

	@Test
	void updateCurrentUserProfile() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		mockMvc.perform(patch("/api/v1/users/current")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "firstName": "Alice",
								  "lastName": "Wong",
								  "location": "Auckland",
								  "description": "Traveller and coffee lover"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.firstName").value("Alice"))
				.andExpect(jsonPath("$.lastName").value("Wong"))
				.andExpect(jsonPath("$.location").value("Auckland"))
				.andExpect(jsonPath("$.description").value("Traveller and coffee lover"))
				.andExpect(jsonPath("$.username").value("alice"))
				.andExpect(jsonPath("$.avatarUrl").value(nullValue()));

		mockMvc.perform(get("/api/v1/users/current")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value("Traveller and coffee lover"));
	}

	@Test
	void presignAvatarThenCurrentUserIncludesAvatarUrl() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		MvcResult presign = mockMvc.perform(post("/api/v1/users/current/avatar/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/png",
								  "sizeBytes": 2048,
								  "fileName": "me.png"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.uploadUrl").isString())
				.andExpect(jsonPath("$.contentType").value("image/png"))
				.andExpect(jsonPath("$.objectKey").value(startsWith("users/")))
				.andReturn();

		JsonNode body = objectMapper.readTree(presign.getResponse().getContentAsString());
		String objectKey = body.get("objectKey").asString();
		assertThat(body.get("uploadUrl").asString()).contains(objectKey);

		User user = userRepository.findByUsername("alice").orElseThrow();
		assertThat(user.getAvatarObjectKey()).isEqualTo(objectKey);
		assertThat(user.getAvatarContentType()).isEqualTo("image/png");
		assertThat(user.getAvatarSizeBytes()).isEqualTo(2048L);

		mockMvc.perform(get("/api/v1/users/current")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.avatarUrl").isString())
				.andExpect(jsonPath("$.avatarUrl").value(org.hamcrest.Matchers.containsString(objectKey)));
	}

	@Test
	void replaceAvatarDeletesPreviousObject() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		String firstKey = presignAvatar(token, "image/jpeg", "a.jpg");
		String secondKey = presignAvatar(token, "image/webp", "b.webp");

		assertThat(firstKey).isNotEqualTo(secondKey);
		assertThat(fakeStorage().getDeletedObjectKeys()).contains(firstKey);

		User user = userRepository.findByUsername("alice").orElseThrow();
		assertThat(user.getAvatarObjectKey()).isEqualTo(secondKey);
		assertThat(user.getAvatarContentType()).isEqualTo("image/webp");
	}

	@Test
	void deleteAvatarClearsMetadataAndStorage() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");
		String objectKey = presignAvatar(token, "image/jpeg", "a.jpg");

		mockMvc.perform(delete("/api/v1/users/current/avatar")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNoContent());

		User user = userRepository.findByUsername("alice").orElseThrow();
		assertThat(user.getAvatarObjectKey()).isNull();
		assertThat(user.getAvatarContentType()).isNull();
		assertThat(user.getAvatarSizeBytes()).isNull();
		assertThat(fakeStorage().getDeletedObjectKeys()).contains(objectKey);

		mockMvc.perform(get("/api/v1/users/current")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.avatarUrl").value(nullValue()));
	}

	private FakeObjectStorage fakeStorage() {
		assertThat(objectStorage).isInstanceOf(FakeObjectStorage.class);
		return (FakeObjectStorage) objectStorage;
	}

	@Test
	void rejectUnsupportedAvatarType() throws Exception {
		String token = loginAndGetToken("alice", "Secret123");

		mockMvc.perform(post("/api/v1/users/current/avatar/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "image/gif",
								  "sizeBytes": 100,
								  "fileName": "x.gif"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	private String presignAvatar(String token, String contentType, String fileName) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/v1/users/current/avatar/presign")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "contentType": "%s",
								  "sizeBytes": 1024,
								  "fileName": "%s"
								}
								""".formatted(contentType, fileName)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("objectKey").asString();
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
}
