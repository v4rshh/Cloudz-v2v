/**
 * IncidentReport model (placeholder schema)
 *
 * Fields:
 * - id: UUID
 * - user_id: UUID (nullable if anonymous)
 * - raw_text: string (original report text/voice transcript)
 * - category: string (harassment | stalking | assault | infrastructure | other)
 * - severity: integer (1-5)
 * - confidence_score: float (from NLP classifier)
 * - location: { lat, lng }
 * - verification_count: integer
 * - status: string (pending | verified | disputed | expired)
 * - created_at: timestamp
 */

export const SQL_CREATE_TABLE = `
CREATE EXTENSION IF NOT EXISTS postgis;

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
`;
