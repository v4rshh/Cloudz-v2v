/**
 * SOSEvent model (placeholder schema)
 *
 * Fields:
 * - id: UUID
 * - user_id: UUID
 * - trigger_type: string (button | voice | anomaly | shake)
 * - location_trail: JSONB array of { lat, lng, timestamp }
 * - media_url: string (S3/Firebase link to recorded evidence, nullable)
 * - contacts_notified: JSONB array of contact ids/numbers
 * - status: string (active | resolved | false_alarm)
 * - created_at, resolved_at: timestamps
 */

export const SQL_CREATE_TABLE = `
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
`;
