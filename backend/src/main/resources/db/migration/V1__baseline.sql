-- Baseline schema for TravelLog.
-- Domain tables (users, journeys, events, ...) land in Phase 2 migrations.

CREATE TABLE schema_meta (
    id          BIGSERIAL PRIMARY KEY,
    app_name    VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO schema_meta (app_name) VALUES ('TravelLog');
