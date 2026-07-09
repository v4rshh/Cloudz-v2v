/**
 * User model (placeholder schema — replace with Prisma/Sequelize/Mongoose model)
 *
 * Fields:
 * - id: UUID
 * - phone: string (unique)
 * - email: string (optional)
 * - language_pref: string (e.g., "en", "hi", "nl")
 * - emergency_contacts: [{ name, phone, relation }]
 * - anonymous_mode: boolean
 * - created_at, updated_at: timestamps
 */

export const SQL_CREATE_TABLE = `
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
`;
