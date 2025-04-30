DROP TABLE IF EXISTS user_divisions;
DROP TABLE IF EXISTS divisions;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    niu VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expired_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS divisions (
    division_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('TECHNICAL', 'MANAGERIAL')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_divisions (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    division_id INTEGER REFERENCES divisions(division_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STAFF', 'KADIV')),
    PRIMARY KEY (user_id, division_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    refresh_token_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    refresh_token_value VARCHAR(255) NOT NULL,
    expired_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_niu ON users(niu);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_refresh_token_value ON refresh_tokens(refresh_token_value);
CREATE INDEX IF NOT EXISTS idx_user_divisions_user_id ON user_divisions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_divisions_division_id ON user_divisions(division_id);

INSERT INTO divisions (name, type, description) VALUES
('DSAI', 'TECHNICAL', 'Data Science and Artificial Intelligence'),
('MobApps', 'TECHNICAL', 'Mobile Applications'),
('GameDev', 'TECHNICAL', 'Game Development'),
('Cysec', 'TECHNICAL', 'Cyber Security'),
('UI/UX', 'TECHNICAL', 'User Interface and User Experience'),
('Backend', 'TECHNICAL', 'Backend Development'),
('Frontend', 'TECHNICAL', 'Frontend Development'),
('CP', 'TECHNICAL', 'Competitive Programming'),
('IA', 'MANAGERIAL', 'Internal Affair'),
('PM', 'MANAGERIAL', 'Project Manager'),
('AM', 'MANAGERIAL', 'Assignation Manager'),
('SD', 'MANAGERIAL', 'Skill Development'),
('EA', 'MANAGERIAL', 'External Affair'),
('RM', 'MANAGERIAL', 'Resource Manager'),
('IT', 'MANAGERIAL', 'Information Technology'),
('HD', 'MANAGERIAL', 'Human Development'),
('BM', 'MANAGERIAL', 'Business Management'),
('CD', 'MANAGERIAL', 'Content and Design'),
('RNC', 'MANAGERIAL', 'Research and Competition');

INSERT INTO users (email, niu, nama_lengkap, password, created_at)
VALUES (
  'admin@gmail.com',
  '123456',
  'Admin OTI Internship',
  '$2b$10$k9V2Q.mGLOaNZ4BwG0zrBepGPJ8MCc.JfZhf8OUbqVWqC0rRVPyBO',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, niu, nama_lengkap, password, created_at)
VALUES (
  'staff@gmail.com',
  '654321',
  'Staff OTI Internship',
  '$2b$10$ZXJyQu9zrGiX2gM.WYmIa.npf3O1IwfgOOUZ4JTYKoRndEIz7F3aG', 
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
  admin_id UUID;
  hd_id INTEGER;
BEGIN
  SELECT user_id INTO admin_id FROM users WHERE email = 'admin@gmail.com';
  SELECT division_id INTO hd_id FROM divisions WHERE name = 'HD';
  
  IF admin_id IS NOT NULL AND hd_id IS NOT NULL THEN
    INSERT INTO user_divisions (user_id, division_id, role)
    VALUES (admin_id, hd_id, 'KADIV');
  END IF;
END $$;

DO $$
DECLARE
  staff_id UUID;
  hd_id INTEGER;
BEGIN
  SELECT user_id INTO staff_id FROM users WHERE email = 'staff@gmail.com';
  SELECT division_id INTO hd_id FROM divisions WHERE name = 'HD';
  
  IF staff_id IS NOT NULL AND hd_id IS NOT NULL THEN
    INSERT INTO user_divisions (user_id, division_id, role)
    VALUES (staff_id, hd_id, 'STAFF');
  END IF;
END $$;