-- Moderation: editors/admins can hide public journeys from Explore without changing owner visibility.
ALTER TABLE journeys
    ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_journeys_public_not_hidden_updated_at
    ON journeys (updated_at DESC)
    WHERE visibility = 'PUBLIC' AND hidden = FALSE;
