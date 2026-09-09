package com.travellog.storage;

import java.time.Duration;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class FakeObjectStorage implements ObjectStorage, AutoCloseable {

	private final Set<String> deletedObjectKeys = ConcurrentHashMap.newKeySet();

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
		deletedObjectKeys.add(objectKey);
	}

	public Set<String> getDeletedObjectKeys() {
		return Collections.unmodifiableSet(deletedObjectKeys);
	}

	public void clearDeletedObjectKeys() {
		deletedObjectKeys.clear();
	}

	@Override
	public void close() {
		// no-op
	}
}
