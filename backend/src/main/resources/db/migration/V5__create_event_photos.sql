CREATE TABLE event_photos (
    id             BIGSERIAL PRIMARY KEY,
    event_id       BIGINT       NOT NULL,
    object_key     VARCHAR(512) NOT NULL,
    content_type   VARCHAR(100) NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    sort_order     INT          NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_event_photos_event
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT uq_event_photos_object_key UNIQUE (object_key),
    CONSTRAINT ck_event_photos_size_positive CHECK (size_bytes > 0),
    CONSTRAINT ck_event_photos_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX idx_event_photos_event_sort ON event_photos (event_id, sort_order ASC);
