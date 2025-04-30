DROP TABLE IF EXISTS meeting_participant;
DROP TABLE IF EXISTS meeting;

CREATE TABLE IF NOT EXISTS meeting (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    join_code VARCHAR(50) UNIQUE NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_participant (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meeting(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reminded_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_meeting_created_by ON meeting(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_join_code ON meeting(join_code);
CREATE INDEX IF NOT EXISTS idx_meeting_date_time ON meeting(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_meeting_participant_meeting_id ON meeting_participant(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participant_user_id ON meeting_participant(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participant_reminded_at ON meeting_participant(reminded_at);