-- Speeds up listing public journeys by recent update.
CREATE INDEX idx_journeys_visibility_updated_at
    ON journeys (visibility, updated_at DESC)
    WHERE visibility = 'PUBLIC';
