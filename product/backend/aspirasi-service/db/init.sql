DROP TABLE IF EXISTS aspirasi;

CREATE TABLE IF NOT EXISTS aspirasi (
    id SERIAL PRIMARY KEY,
    sender_id UUID,                    
    target VARCHAR(100) NOT NULL,       
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aspirasi_sender_id ON aspirasi(sender_id);
CREATE INDEX IF NOT EXISTS idx_aspirasi_target ON aspirasi(target);
CREATE INDEX IF NOT EXISTS idx_aspirasi_created_at ON aspirasi(created_at);