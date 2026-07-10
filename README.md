#SafeSphere — Premium Safety Navigation & Emergency Response Web Application

SafeSphere is an intelligent, AI-powered women's safety platform combining safe navigation, a RAG-powered safety assistant ("Sahara"), smart incident reporting, and emergency SOS response. Both the web client and backend API are fully built in **TypeScript** for robust compile-time safety.

---

## 🌟 Features Implemented in the Web Dashboard

### 1. Interactive Safety Map
*   **Aesthetics**: Styled with a premium dark map overlay using **Leaflet** (`react-leaflet`).
*   **Routing**: Renders safety-scored routes (Safest, Well-Lit, Fastest) in distinct colors.
*   **Toggles**: Features dynamic checkbox overlays for crowdsourced risk heatmaps, streetlights, and traffic layers.

### 2. Sahara AI Safety Assistant
*   **Interface**: Grounded glassmorphic chat layout with automatic scrollbars.
*   **Citations**: Returns safety answers and displays verified legal source citations.
*   **Crisis Interception**: Real-time crisis keyword scanner: typing expressions like *"someone is following me"* automatically redirects the interface to the SOS Hub.

### 3. Smart Incident Reporting
*   **Tagging**: Automatically tags incident category and severity via backend NLP classifier services.
*   **Review Flow**: Displays an AI review step letting users confirm or adjust tags before submission.
*   **Credibility**: Includes a community feed where other users upvote or downvote reports to verify credibility.

### 4. Emergency SOS Hub
*   **Panic Button**: Giant pulsating SOS button with a cancellable 5-second countdown.
*   **Alarm**: Synthesizes a real police siren audio alarm using the browser's native HTML5 **AudioContext** API.
*   **Evidence Recording**: Requests webcam access to display a live feed and simulate secure cloud evidence recording.
*   **Follow Me**: Live tracking simulation with automatic path-deviation alarms and soft check-in verification triggers.

---

## 📋 Functional Requirements & Scope

Requirements are prioritized to ensure rapid scope decisions during hackathon build phases:

### 🔴 MUST (Core Demo Path)
*   **FR1 — VibeRoute: Safety-Scored Navigation**:
    *   User enters start & destination; app returns both fastest and "safest" routes.
    *   Each route segment is color-coded by computed safety score.
    *   Safety score is a weighted function of incident density, time-of-day, and proximity to "safe nodes" (police, hospitals, 24h businesses).
    *   Users can drop "vibe tags" on blocks (e.g. "unlit alley", "crowded area") to immediately update the scoring model.
*   **FR2 — Anonymous Incident Reporting & Live Heatmap**:
    *   One-tap report (type, auto-location, optional note) with zero account details required.
    *   Reports render on a live heatmap in near-real-time and feed the FR1 navigation scoring engine.
*   **FR3 — One-Tap GhostCall**:
    *   A single control launches a full-screen simulated native incoming call screen.
    *   Realistic ringtone plays; answering plays a pre-generated voice clip of a real person speaking.
    *   No confirmation step (triggerable in under 2 taps from anywhere).
*   **FR4 — ShadowStream: SOS & Live Tracking**:
    *   One-tap SOS immediately broadcasts GPS location updates.
    *   Sends SMS automatically to trusted contacts with a secure, unindexed tracking web link.
    *   The link opens a live map showing position updates in real-time with no login or app install required for the contact.
*   **FR5 — Trusted Contacts Management**:
    *   Add, edit, and remove trusted contacts (name + phone number) ahead of time.

### 🟡 STRETCH (Built if core path completes early)
*   **FR6 — AuraSense Companion Mode**:
    *   Stealth display (looks powered-off to onlookers) that keeps screen alive via browser Wake Lock API.
    *   Periodic "Are you OK?" prompts, escalating automatically to FR4 (SOS) if ignored.
*   **FR7 — Follow Me / Deviation Alerts**:
    *   Share live walk with a friend, auto-alerting on unexpected stops or path deviations.

### ❌ CUT (Explicitly out of scope)
*   **Continuous Background Audio Threat Detection**: Blocked by iOS Safari killing microphone access on screen lock.
*   **Native iOS/Android Apps (React Native)**: Cut to prioritize a zero-friction mobile Web PWA.
*   **Infrastructure Overhead**: Self-hosted routing engines (OSRM), standalone Python microservices, and S3 evidence encryption.

---

## 🛠️ Tech Stack

### 1. Frontend Web Client (`/frontend`)
*   **Core**: React (v19) + Vite (v8) + TypeScript
*   **Mapping**: Leaflet (`leaflet`, `react-leaflet`) with premium dark spatial tile overlays
*   **Icons**: Lucide React (`lucide-react`)
*   **Networking & Real-Time**: Axios client gateway + Socket.io-client for live location broadcasting
*   **Styling**: Pure Vanilla CSS system (`index.css`) with curated dark-theme HSL color tokens and glassmorphism elements

### 2. Backend API Gateway (`/backend`)
*   **Core**: Node.js + Express + TypeScript (`ts-node-dev` for hot-reloading development compiler)
*   **Security & Auth**: JWT (`jsonwebtoken`) OTP-verification bypass stubs (accepts any 6-digit code for testing)
*   **Real-time channels**: Socket.io server supporting live coordinator room connection
*   **Database Schema**: Raw SQL tables definition supporting PostGIS spatial indexing (ready for PostgreSQL)

### 3. AI Microservice (`/ai-services`)
*   **Core**: Python 3.14 + FastAPI + Uvicorn
*   **RAG Engine**: Pure Python TF-IDF database index compiler (`ingest.py`) + Cosine Similarity ranking matches retriever (`retriever.py`)
*   **Language Model**: Google Gemini API integration (supporting `gemini-2.5-flash`, `gemini-3.5-flash`, and `gemini-flash-latest`)
*   **Offline Fallback**: Resilient keyless mode mapping text segments and local emergency guide citations directly to the UI if no API key is provided
*   **Incident Classifier**: NLP keyword scanner ranking category and severity from 1 (low) to 5 (critical)

---

## 📂 Project Structure

```text
Cloudz-v2v/
├── frontend/            # React + Vite TypeScript client dashboard (maps, Sahara RAG chat, SOS webcams)
├── backend/             # Node.js + Express TypeScript API gateway (auth, navigation proxy, SOS channels)
├── ai-services/         # Python FastAPI AI microservice (RAG, NLP classifier, deviation anomalies)
│   ├── main.py          # FastAPI startup and endpoints routing
│   └── rag/             # RAG pipeline directory
│       ├── documents/   # Safety manuals folder (rotterdam_safety_guide.md)
│       └── rag_store.json # Local TF-IDF indexed database
├── docs/                # Architecture and specifications overview
├── docker-compose.yml   # Multi-service dev orchestration
├── tsconfig.json        # Root compiler configuration rules
└── .env                 # Environment config file (holding API keys)
```

---

## 🚀 Setup & Launch Instructions

Follow these instructions in three separate terminal tabs:

### 1. Root Configuration
Create your environment file in the project root:
```powershell
# Copy the template to active config
cp .env.example .env
```
*(Open `.env` and fill in your optional `GEMINI_API_KEY=AIzaSy...` key. If left blank, Sahara will dynamically fall back to offline local citations search).*

---

### Tab 1: Start Python AI Services
1. Navigate to the folder and install dependencies:
   ```powershell
   cd ai-services
   pip install fastapi uvicorn pydantic python-dotenv google-generativeai
   ```
2. Run document ingestion once to build the local index database:
   ```powershell
   cd rag
   python ingest.py
   cd ..
   ```
3. Start the FastAPI microservice on port 8000:
   ```powershell
   python -m uvicorn main:app --port 8000
   ```
   *Health Check endpoint:* `GET http://localhost:8000/health`

---

### Tab 2: Start Node.js Express Gateway
1. Navigate to the folder and install dependencies:
   ```powershell
   cd backend
   npm install
   ```
2. Start the hot-reloading development server on port 4000:
   ```powershell
   npm start
   ```
   *Health Check endpoint:* `GET http://localhost:4000/health`

---

### Tab 3: Start Vite Web Frontend
1. Navigate to the folder and install dependencies:
   ```powershell
   cd frontend
   npm install
   ```
2. Start the Vite hot-reloading client on port 5173:
   ```powershell
   npm run dev
   ```
3. Open your browser and go to **[http://localhost:5173/](http://localhost:5173/)** to access the premium web dashboard.

---

## 🔬 Testing Dashboard Features

Once the 3 services are running, verify the following:
*   **Ask Sahara (RAG Chat)**: Go to "Ask Sahara" and search: *"What is the police number in Rotterdam?"* Sahara will retrieve contacts and laws from your local safety document, citing them as clickable badges.
*   **Automatic Intercept**: Type *"someone is following me"* in the Sahara chat. It will intercept the message, trigger an alert modal, and redirect you to the SOS Panel.
*   **Emergency SOS**: Click the giant SOS button. The browser will beep a synthesized siren, countdown 5 seconds, and request webcam access for evidence logging.
