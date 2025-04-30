-- Drop tables if they exist
DROP TABLE IF EXISTS participation;
DROP TABLE IF EXISTS progress;
DROP TYPE IF EXISTS "ParticipationStatus";

-- Create enum type
CREATE TYPE "ParticipationStatus" AS ENUM ('accepted', 'rejected', 'pending');

-- Create participation table
CREATE TABLE IF NOT EXISTS participation (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  details TEXT,
  status "ParticipationStatus" NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  committee_progress NUMERIC DEFAULT 0,
  task_progress NUMERIC DEFAULT 0,
  presence_progress NUMERIC DEFAULT 0,
  total_progress NUMERIC DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_participation_user_id ON participation(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);