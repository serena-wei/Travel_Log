package com.travellog.storage;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(S3Properties.class)
public class ObjectStorageConfig {

	@Bean(destroyMethod = "close")
	ObjectStorage objectStorage(S3Properties properties) {
		if (!properties.isConfigured()) {
			return new FakeObjectStorage();
		}
		Region region = Region.of(properties.region());
		var credentials = DefaultCredentialsProvider.create();
		S3Client s3Client = S3Client.builder()
				.region(region)
				.credentialsProvider(credentials)
				.build();
		S3Presigner s3Presigner = S3Presigner.builder()
				.region(region)
				.credentialsProvider(credentials)
				.build();
		return new S3ObjectStorage(s3Client, s3Presigner, properties.bucket());
	}
}
