<<<<<<< HEAD
# SafeRoute AI — Premium Safety Navigation & Emergency Response Web Application

SafeRoute AI is an intelligent, AI-powered women's safety platform combining safe navigation, a RAG-powered safety assistant ("Sahara"), smart incident reporting, and emergency SOS response, now fully built as a modern web application dashboard.

## Project Structure

```
saferoute-ai/
├── frontend/            # React + Vite web application dashboard (Leaflet maps, Sahara RAG chat, SOS webcams)
├── backend/             # Node.js + Express API (auth, navigation, reports, SOS, chat proxy)
├── ai-services/         # Python FastAPI services (RAG assistant, NLP classifier, risk model, anomaly detection)
├── mobile-app/          # React Native app skeleton
├── docs/                # Architecture & design docs
├── docker-compose.yml   # Local dev orchestration
└── .env.example         # Environment variable template
```

---

## Features Implemented in the Web Dashboard

### 1. Interactive Safety Map
- Styled with a premium dark map overlay using **Leaflet** (`react-leaflet`).
- Renders safety-scored routes (Safest, Well-Lit, Fastest) in distinct colors.
- Features dynamic toggles for a crowdsourced **Risk Heatmap**, streetlights, and foot traffic layers.

### 2. Sahara AI Safety Assistant
- Grounded glassmorphic chat interface.
- Returns safety answers and displays verified legal source citations.
- Integrates a real-time crisis keyword scanner: typing expressions like *"someone is following me"* automatically redirects the interface to the SOS Hub.

### 3. Smart Incident Reporting
- Allows users to describe situations in free text.
- Automatically tags incident category and severity via backend NLP classifier services.
- Displays an AI review step letting users confirm or adjust tags before submission.
- Includes a community feed where other users upvote or downvote reports to verify credibility.

### 4. Emergency SOS Hub
- Giant pulsating SOS panic button with a cancellable 5-second countdown.
- Synthesizes a real police siren audio alarm using the browser's native HTML5 **AudioContext** API.
- Automatically requests webcam and microphone access to display a live feed and simulate secure cloud evidence recording.
- Includes a "Follow Me" live tracking simulation with automatic path-deviation alarms and soft check-in verification triggers.

---

## Quick Start (Local Development)

All services are configured for local development.

### 1. Clone & Configure Environment
Create a `.env` file in the root folder (preconfigured templates are ready):
```bash
cp .env.example .env
```

### 2. Start Python AI Services
Installs the lightweight FastAPI, uvicorn, and pydantic dependencies and starts the server on port 8000:
```bash
cd ai-services
pip install fastapi uvicorn pydantic python-dotenv
python -m uvicorn main:app --port 8000
```
*AI Health Check:* `GET http://localhost:8000/health`

### 3. Start Node.js Backend Server
Installs Express and Socket.io dependencies and runs on port 4000:
```bash
cd backend
npm install
npm start
```
*Backend Health Check:* `GET http://localhost:4000/health`

### 4. Start the Web Frontend
Installs the React packages and runs the hot-reloading development server on port 5173:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser to interact with the dashboard.
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 196969c3b80008806ab4b2e827b94ed684c898ab
