CREATE TABLE journeys (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    start_date      DATE,
    end_date        DATE,
    visibility      VARCHAR(20)  NOT NULL DEFAULT 'PRIVATE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_journeys_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_journeys_visibility
        CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT ck_journeys_date_range
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_journeys_user_updated_at ON journeys (user_id, updated_at DESC);
