# SafeRoute AI — AI Services microservice

This Python FastAPI microservice acts as the "AI brain" of the SafeRoute platform. It handles incident report classifications, spatial safety scoring, movement anomaly monitoring, and the RAG safety chatbot.

---

## What We Have Built / Upgraded

### 1. In-Memory RAG Safety Assistant (`rag/`)
We upgraded the Sahara assistant from placeholder stubs into a fully functional local Retrieval-Augmented Generation (RAG) system:
- **Rotterdam Safety Guide (`documents/rotterdam_safety_guide.md`)**: Created a document with actual emergency numbers (Police 112, Veilig Thuis, Slachtofferhulp), safety havens (Centraal Station, police bureaus), and Dutch Penal Code harassment/stalking articles.
- **TF-IDF Document Compiler (`ingest.py`)**: Programmed a custom word splitter and TF-IDF document database compiler. It parses documents in the folder and writes a vector-ready index to `rag_store.json`.
- **Cosine Similarity Retriever (`retriever.py`)**: Implemented Cosine Similarity vector ranking matching queries against the indexed chunks, calculating query tf-idf vectors dynamically.
- **Gemini LLM Orchestrator (`rag_pipeline.py`)**: Wired the assistant to the Google Gemini API (`google-generativeai`). It formats the system instruction and context, fetching answers conversationally.
- **Resilient Offline/Keyless Fallback**: If no Gemini API key is configured, the system **runs keyless**, extracting retrieved citations from `rag_store.json` and printing them directly as cited bullets in the chat.

### 2. Incident Classification (`classifier/`)
- Rules-based keyword classifier that scans harassment description reports.
- Automatically flags incident category (`stalking`, `harassment`, `assault`, `infrastructure`, `other`) and weights severity from `1` (low) to `5` (critical).
- Returns classification confidence weights and flags items that need manual review.

### 3. Route Risk Scoring (`risk_model/`)
- Computes spatial safety ratings from `0` to `100`.
- Generates route options drawn on the Leaflet map (Fastest, Well-Lit, Safest).
- Computes bounding box risk hotspots overlays for the crowdsourced Incident Heatmap.

### 4. Movement Anomaly Monitor (`anomaly/`)
- Implements stationary alarms for **"Follow Me"** tracking sessions.
- Triggers a check-in alert if coordinates remain unchanged for >120s, escalating to a full SOS if ignored.

---

## Technical Setup & Startup

The microservice has been integrated with the root `.env` file loader on startup.

### 1. Environment Variable Configuration
Open the `.env` file in the **project root folder** (`saferoute-ai/.env`) and add your Gemini model credentials:
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Run Document Ingestion
Compile the local index database:
```bash
cd ai-services/rag
python ingest.py
```
This generates `rag_store.json`.

### 3. Start the FastAPI Server
Launch the development server on port 8000:
```bash
cd ai-services
python -m uvicorn main:app --port 8000
```
- Health Check: `http://localhost:8000/health`
- Swagger Interactive Documentation: `http://localhost:8000/docs`
