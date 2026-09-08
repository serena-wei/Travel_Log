package com.travellog.storage;

import java.time.Duration;

public interface ObjectStorage {

	String createUploadUrl(String objectKey, String contentType, Duration expiry);

	String createDownloadUrl(String objectKey, Duration expiry);

	void deleteObject(String objectKey);
}
