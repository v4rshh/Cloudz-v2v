import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from the root project .env
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_env = os.path.join(current_dir, "..", ".env")
load_dotenv(parent_env)

from rag.rag_pipeline import answer_question
from classifier.classify import classify_incident
from risk_model.risk_score import score_routes, get_heatmap
from anomaly.anomaly_detector import check_anomaly

app = FastAPI(title="SafeRoute AI Services")


@app.get("/health")
def health():
    return {"status": "ok", "service": "saferoute-ai-services"}


# ---------- RAG Safety Assistant ----------
class ChatRequest(BaseModel):
    question: str
    language: Optional[str] = "en"


@app.post("/rag/ask")
def rag_ask(req: ChatRequest):
    result = answer_question(req.question, language=req.language)
    return result


# ---------- Incident Classification ----------
class ClassifyRequest(BaseModel):
    text: str


@app.post("/classify/incident")
def classify(req: ClassifyRequest):
    result = classify_incident(req.text)
    return result


# ---------- Risk Scoring / Navigation ----------
class RouteRequest(BaseModel):
    origin: dict
    destination: dict


@app.post("/risk/score-routes")
def score_routes_endpoint(req: RouteRequest):
    result = score_routes(req.origin, req.destination)
    return result


@app.get("/risk/heatmap")
def heatmap_endpoint(minLat: float, minLng: float, maxLat: float, maxLng: float):
    result = get_heatmap(minLat, minLng, maxLat, maxLng)
    return result


# ---------- Movement Anomaly Detection ----------
class AnomalyRequest(BaseModel):
    session_id: str
    location_trail: List[dict]  # [{lat, lng, timestamp}]


@app.post("/anomaly/check")
def anomaly_check(req: AnomalyRequest):
    result = check_anomaly(req.session_id, req.location_trail)
    return result
