# SafeSphere — Premium Safety Navigation & Emergency Response PWA

SafeSphere is an AI-powered women's safety platform combining safety-scored navigation (**VibeRoute**), anonymous incident reporting, a RAG-powered safety assistant ("Sahara"), emergency SOS with live tracking, and discreet de-escalation tools (**GhostCall**). The entire product ships as a single **Next.js 16 (App Router)** Progressive Web Application backed by **Supabase** (Postgres + Realtime) and deployable to Vercel with zero multi-service orchestration.

For system diagrams and data-flow detail, see [`docs/architecture.md`](docs/architecture.md).

---

## Team Ownership

### VibeRoute — Maps & Safety Score

Owns everything map-visual and routing intelligence.

| Area | Implementation |
|---|---|
| **Mapbox GL JS** | Dark `mapbox://styles/mapbox/dark-v11` canvas in `components/SafetyMap.tsx` and `app/track/[id]/page.tsx`; SSR-disabled dynamic import on the dashboard |
| **Directions API** | Route geometry served by `POST /api/navigation/route`; designed for Mapbox Directions integration with safety re-ranking on top |
| **Dual-route rendering** | Fastest vs. safest (plus Well-Lit) routes drawn as color-coded GeoJSON line layers with selectable emphasis |
| **Safety scoring** | Weighted score from incident density, time-of-day factors, and proximity to seeded **safe nodes** (police, hospitals, 24h businesses); PostGIS-ready via Supabase geography columns |
| **Heatmap layer** | Risk zones driven by the `incident_reports` table; toggleable overlay on the map control panel |
| **Vibe-tag drop** | Click anywhere on the Mapbox canvas to drop a community vibe tag (unlit block, crowded area, suspicious activity, safe spot) |

**Key files:** `components/SafetyMap.tsx`, `app/api/navigation/route/route.ts`, `app/api/reports/route.ts`

### Integrations & GhostCall — APIs & Demo Lead

Owns external integrations, anonymous reporting, and the hackathon dress rehearsal.

| Area | Implementation |
|---|---|
| **Twilio SMS (SOS)** | `POST /api/sos` fires SMS to trusted contacts with an unauthenticated tracking link (`/track/[id]`) |
| **GhostCall** | Fullscreen fake incoming-call UI (`components/GhostCall.tsx`): Web Audio ringtone loop, answer/decline interaction, SpeechSynthesis voice line on pickup |
| **Incident reporting** | Anonymous form + `POST /api/reports` NLP classifier; writes to `incident_reports` and feeds the VibeRoute heatmap |
| **Demo seeding & pitch** | Realistic Rotterdam demo data (pre-loaded routes, heatmap zones, community feed, safe-node markers) so the core path works offline without API keys |

**Key files:** `app/api/sos/route.ts`, `components/GhostCall.tsx`, `components/IncidentReporter.tsx`, `app/api/reports/route.ts`, `lib/supabase.ts`

---

## Features

### 1. VibeRoute Safety Map
- Mapbox GL JS dark overlay with pitched 3D perspective
- Three candidate routes: **Safest AI-Corridor**, **Well-Lit Walkway**, and **Fastest Route** — each with a computed safety score pill
- Toggleable overlay layers: heatmap, streetlights, foot traffic
- Click-to-drop **vibe tags** with preset categories
- Seeded safe-node markers (police stations, verified safe hubs)
- Graceful offline fallback when `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is not set

### 2. Anonymous Incident Reporting & Live Heatmap
- One-tap anonymous report form with optional location scrubbing
- Backend NLP classifier (`/api/reports`) auto-tags category and severity (1–5)
- AI review step: user confirms or adjusts tags before publishing
- Community feed with upvote/downvote credibility scoring
- Reports persist to `incident_reports` (PostGIS `POINT` geography) and feed route scoring

### 3. GhostCall — One-Tap De-escalation
- Triggerable from the sidebar in under 2 taps from anywhere in the dashboard
- Fullscreen simulated native call screen ("Dad ❤️")
- Realistic dual-frequency ringtone via Web Audio API oscillators
- Answering plays a pre-generated companion voice line via `SpeechSynthesis`
- Connected-state dial pad mock with live call timer

### 4. ShadowStream — SOS & Live Tracking
- Giant pulsating SOS button with cancellable 5-second countdown
- Browser-synthesized police siren via `AudioContext`
- Webcam evidence feed on activation
- Twilio SMS blast to trusted contacts with secure tracking link
- Public `/track/[id]` page: live Mapbox map subscribed to Supabase Realtime `sos_events` updates
- **Follow Me** mode with path-deviation check-ins and soft verification prompts

### 5. Sahara AI Safety Assistant
- Glassmorphic RAG chat grounded in `lib/rag_store.json` (local TF-IDF index)
- Gemini 2.5 Flash integration with offline citation fallback
- Crisis keyword interceptor: phrases like *"someone is following me"* auto-redirect to the SOS hub

### 6. AuraSense Companion Mode (Stretch)
- Stealth display that looks powered-off to onlookers
- Screen Wake Lock API keeps the device active during walks
- Periodic "Are you OK?" prompts escalating to SOS if ignored

---

## Functional Requirements & Scope

### MUST (Core Demo Path)

| ID | Requirement | Status |
|---|---|---|
| **FR1** | **VibeRoute**: fastest + safest routes, color-coded safety scores, vibe-tag drops | Implemented |
| **FR2** | **Anonymous reporting** → live heatmap → navigation scoring engine | Implemented |
| **FR3** | **GhostCall**: fullscreen fake call, ringtone, voice line, <2 taps | Implemented |
| **FR4** | **ShadowStream SOS**: GPS broadcast, Twilio SMS with tracking link, live map for contacts | Implemented |
| **FR5** | **Trusted contacts** management (name + phone) | Implemented |

### STRETCH

| ID | Requirement | Status |
|---|---|---|
| **FR6** | **AuraSense** companion mode with Wake Lock | Implemented |
| **FR7** | **Follow Me** / deviation alerts | Partial (client simulation + API stub) |

### CUT

- Continuous background audio threat detection (blocked by iOS Safari mic limits)
- Native iOS/Android apps (React Native)
- Self-hosted routing engines (OSRM), standalone Python microservices, S3 evidence encryption

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4, glassmorphism dark theme (`app/globals.css`) |
| **Mapping** | Mapbox GL JS v3 (`mapbox-gl`) |
| **Database** | Supabase (PostgreSQL + PostGIS geography + Realtime WebSockets) |
| **SMS** | Twilio (`twilio` SDK) |
| **AI / RAG** | Google Gemini (`@google/genai`) + local TF-IDF index (`lib/rag_store.json`) |
| **PWA** | `next-pwa` for installable mobile web experience |
| **Icons** | Lucide React |

---

## Project Structure

```text
Cloudz-v2v/
├── app/
│   ├── api/
│   │   ├── auth/           # OTP login/register stubs
│   │   ├── chat/           # Sahara RAG + crisis interceptor
│   │   ├── navigation/route/  # VibeRoute safety-scored paths + heatmap
│   │   ├── reports/        # Anonymous incident classifier + PostGIS insert
│   │   └── sos/            # Twilio SMS, follow-me, resolve endpoints
│   ├── dashboard/          # Main PWA shell (tab routing)
│   ├── track/[id]/       # Public live-tracking page (no auth)
│   ├── layout.tsx
│   ├── page.tsx            # Auth bypass → dashboard redirect
│   └── globals.css
├── components/
│   ├── SafetyMap.tsx       # VibeRoute Mapbox canvas + vibe tags
│   ├── GhostCall.tsx       # Fullscreen fake-call overlay
│   ├── IncidentReporter.tsx
│   ├── EmergencySOS.tsx
│   ├── SaharaChat.tsx
│   ├── AuraSense.tsx
│   ├── Sidebar.tsx
│   └── UserProfile.tsx
├── lib/
│   ├── supabase.ts         # Supabase client + offline mock fallback
│   └── rag_store.json      # Local TF-IDF safety document index
├── docs/
│   └── architecture.md
├── package.json
└── tsconfig.json
```

---

## Setup & Launch

### Prerequisites

- Node.js 20+
- npm
- (Optional) Supabase project with PostGIS enabled
- (Optional) Mapbox, Twilio, and Gemini API keys for full integration

### 1. Install dependencies

```powershell
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```env
# Mapbox (VibeRoute map + live tracking)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...

# Supabase (incident_reports, sos_events, Realtime)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Twilio (SOS SMS blast)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Site URL (tracking links in SMS)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Gemini (Sahara RAG chat — optional, falls back to local citations)
GEMINI_API_KEY=AIzaSy...
```

All keys are optional for the demo path. Without them, the app runs in **offline bypass mode** with seeded Rotterdam data and console-logged SMS stubs.

### 3. Start the dev server

```powershell
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — the landing page auto-redirects to `/dashboard`.

### 4. Production build

```powershell
npm run build
npm start
```

---

## Demo Dress Rehearsal (Pitch Flow)

Run this sequence for a live demo without external API keys:

1. **VibeRoute Map** — Show three scored routes; click the map to drop a vibe tag; toggle heatmap overlay
2. **Report Incident** — Submit an anonymous report; review AI classification; publish to community feed
3. **GhostCall** — Hit the sidebar GhostCall button; let it ring; answer and hear the companion voice line
4. **Emergency SOS** — Trigger SOS countdown; show siren + webcam; contacts receive tracking link (logged to console in bypass mode)
5. **Live Tracking** — Open `/track/[sosEventId]` in a second browser tab; watch simulated coordinate updates on Mapbox
6. **Sahara Chat** — Ask *"What is the police number in Rotterdam?"* for RAG citations; type *"someone is following me"* to trigger crisis redirect

---

## Database Schema (Supabase)

Key tables expected by the API routes:

| Table | Purpose |
|---|---|
| `incident_reports` | Anonymous safety reports with PostGIS `location` (geography POINT), `category`, `severity`, `confidence_score` |
| `sos_events` | Active SOS sessions with `location_trail` (JSONB), `contacts_notified`, `status`, Realtime-enabled |
| `safe_nodes` | Seeded proximity anchors (police, hospitals, 24h businesses) for PostGIS `ST_DWithin` scoring queries |

Enable the **PostGIS** extension in Supabase and turn on **Realtime** for `sos_events`.

---

## API Routes

| Endpoint | Method | Owner | Description |
|---|---|---|---|
| `/api/navigation/route` | POST | VibeRoute | Returns safety-scored route paths + heatmap zones |
| `/api/reports` | POST, GET | Integrations | Classify and persist anonymous incident reports |
| `/api/sos` | POST | Integrations | Create SOS event, send Twilio SMS with tracking link |
| `/api/sos/follow-me` | POST | Integrations | Start Follow Me monitoring session |
| `/api/sos/resolve` | POST | Integrations | Mark SOS event as resolved |
| `/api/chat` | POST | Sahara | RAG query with crisis keyword interception |
| `/api/auth/login` | POST | Auth | OTP login stub |
| `/api/auth/register` | POST | Auth | Registration stub |

---

## Testing Checklist

- [ ] VibeRoute renders three routes with safety score pills on Mapbox (or offline mock)
- [ ] Click map canvas → vibe tag form → marker appears
- [ ] Submit anonymous report → NLP classification review → appears in community feed
- [ ] GhostCall rings, answers with voice line, ends cleanly
- [ ] SOS countdown → siren → webcam → SMS stub/log with tracking URL
- [ ] `/track/[id]` shows live marker updates via Supabase Realtime (or mock interval)
- [ ] Sahara returns cited answers; crisis keywords redirect to SOS tab
- [ ] Trusted contacts persist in localStorage via Profile Settings
