package com.travellog.storage;

import java.time.Duration;

public class FakeObjectStorage implements ObjectStorage, AutoCloseable {

	@Override
	public String createUploadUrl(String objectKey, String contentType, Duration expiry) {
		return "https://example.invalid/upload/" + objectKey;
	}

	@Override
	public String createDownloadUrl(String objectKey, Duration expiry) {
		return "https://example.invalid/download/" + objectKey;
	}

	@Override
	public void deleteObject(String objectKey) {
		// no-op
	}

	@Override
	public void close() {
		// no-op
	}
}
