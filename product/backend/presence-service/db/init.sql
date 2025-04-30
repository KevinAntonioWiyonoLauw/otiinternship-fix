DROP TABLE IF EXISTS presence;

CREATE TABLE IF NOT EXISTS presence (
    id SERIAL PRIMARY KEY,
    training_id INTEGER NOT NULL,   -- References training ID in Training Service
    user_id UUID NOT NULL,          -- References user ID from Auth Service
    presence_type VARCHAR(20) NOT NULL CHECK (presence_type IN ('QR', 'Manual')),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate presence entries for the same user and training
CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_unique_attendance ON presence(training_id, user_id);

CREATE INDEX IF NOT EXISTS idx_presence_training_id ON presence(training_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_timestamp ON presence(timestamp);