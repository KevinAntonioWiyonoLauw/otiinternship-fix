CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    token VARCHAR(255),
    user_id VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);