-- Drop existing tables with correct dependency order
DROP TABLE IF EXISTS presence;
DROP TABLE IF EXISTS training_participant;
DROP TABLE IF EXISTS training;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS training (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    division_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_participant (
    id SERIAL PRIMARY KEY,
    training_id INTEGER REFERENCES training(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reminded_at TIMESTAMP NULL 
);

CREATE TABLE IF NOT EXISTS presence (
    id SERIAL PRIMARY KEY,
    training_id INTEGER REFERENCES training(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    presence_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_created_by ON training(created_by);
CREATE INDEX IF NOT EXISTS idx_training_date_time ON training(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_training_participant_training_id ON training_participant(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participant_user_id ON training_participant(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_training_id ON presence(training_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence(user_id);