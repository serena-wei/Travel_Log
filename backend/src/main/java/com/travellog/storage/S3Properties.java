package com.travellog.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "travellog.s3")
public record S3Properties(
		String bucket,
		String region,
		long uploadUrlExpirySeconds,
		long downloadUrlExpirySeconds
) {
	public boolean isConfigured() {
		return bucket != null && !bucket.isBlank();
	}
}
