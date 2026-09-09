package com.travellog.storage;

import java.time.Duration;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

public class S3ObjectStorage implements ObjectStorage, AutoCloseable {

	private final S3Client s3Client;
	private final S3Presigner s3Presigner;
	private final String bucket;

	public S3ObjectStorage(S3Client s3Client, S3Presigner s3Presigner, String bucket) {
		this.s3Client = s3Client;
		this.s3Presigner = s3Presigner;
		this.bucket = bucket;
	}

	@Override
	public String createUploadUrl(String objectKey, String contentType, Duration expiry) {
		PutObjectRequest objectRequest = PutObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.contentType(contentType)
				.build();
		PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
				.signatureDuration(expiry)
				.putObjectRequest(objectRequest)
				.build();
		return s3Presigner.presignPutObject(presignRequest).url().toString();
	}

	@Override
	public String createDownloadUrl(String objectKey, Duration expiry) {
		GetObjectRequest objectRequest = GetObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.build();
		GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
				.signatureDuration(expiry)
				.getObjectRequest(objectRequest)
				.build();
		return s3Presigner.presignGetObject(presignRequest).url().toString();
	}

	@Override
	public void deleteObject(String objectKey) {
		s3Client.deleteObject(DeleteObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.build());
	}

	@Override
	public void close() {
		s3Presigner.close();
		s3Client.close();
	}
}
