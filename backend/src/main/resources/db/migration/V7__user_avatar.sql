ALTER TABLE users
    ADD COLUMN avatar_object_key   VARCHAR(512),
    ADD COLUMN avatar_content_type VARCHAR(100),
    ADD COLUMN avatar_size_bytes   BIGINT;

ALTER TABLE users
    ADD CONSTRAINT ck_users_avatar_size_positive
        CHECK (avatar_size_bytes IS NULL OR avatar_size_bytes > 0);

ALTER TABLE users
    ADD CONSTRAINT uq_users_avatar_object_key UNIQUE (avatar_object_key);
