-- SafeRoute AI — Database Initialization Script
-- Run this against your Postgres instance (with PostGIS available) to set up base tables.
-- Usage: psql $DATABASE_URL -f init.sql

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ==== Users ====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  language_pref VARCHAR(10) DEFAULT 'en',
  emergency_contacts JSONB DEFAULT '[]',
  anonymous_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==== Incident Reports ====
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  category VARCHAR(50),
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  confidence_score FLOAT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  verification_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_location ON incident_reports USING GIST (location);

-- ==== SOS Events ====
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_type VARCHAR(20) NOT NULL,
  location_trail JSONB DEFAULT '[]',
  media_url TEXT,
  contacts_notified JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- ==== Knowledge Documents (for RAG source tracking, embeddings stored in vector DB) ====
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  source_type VARCHAR(50), -- law | helpline | ngo | general
  content TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- ==== Chat Sessions (Sahara assistant history) ====
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  retrieved_sources JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
