CREATE TABLE events (
    id                BIGSERIAL PRIMARY KEY,
    journey_id        BIGINT       NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    start_at          TIMESTAMP    NOT NULL,
    end_at            TIMESTAMP,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_events_journey
        FOREIGN KEY (journey_id) REFERENCES journeys (id) ON DELETE CASCADE,
    CONSTRAINT ck_events_time_range
        CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE INDEX idx_events_journey_start_at ON events (journey_id, start_at ASC);
