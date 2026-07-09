"""
Incident report NLP classifier.

Given free-text (or voice-transcribed) incident report text, classify:
- category: harassment | stalking | assault | infrastructure | other
- severity: 1 (low) to 5 (critical)
- confidence_score: 0.0 - 1.0

Base setup uses a simple keyword-based heuristic as a stub so the endpoint
is functional out of the box. Replace with a fine-tuned transformer
(e.g., DistilBERT) or an LLM few-shot classification call for production.
"""

from typing import Dict

CATEGORY_KEYWORDS = {
    "stalking": ["followed", "following", "stalking", "watching me", "waited outside"],
    "harassment": ["catcall", "catcalled", "whistled", "inappropriate comment", "harassed", "harassment"],
    "assault": ["touched", "grabbed", "assault", "attacked", "groped", "hit me"],
    "infrastructure": ["no streetlight", "dark alley", "poor lighting", "no cctv", "broken light"],
}

SEVERITY_KEYWORDS = {
    5: ["assault", "attacked", "weapon", "grabbed"],
    4: ["followed", "stalking", "groped", "touched"],
    3: ["harassed", "harassment", "catcalled"],
    2: ["uncomfortable", "stared", "whistled"],
    1: ["dark", "poor lighting", "no cctv"],
}


def classify_incident(text: str) -> Dict:
    lowered = text.lower()

    # Category detection
    category = "other"
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(k in lowered for k in keywords):
            category = cat
            break

    # Severity detection (highest matching severity wins)
    severity = 2  # default moderate-low
    for level in sorted(SEVERITY_KEYWORDS.keys(), reverse=True):
        if any(k in lowered for k in SEVERITY_KEYWORDS[level]):
            severity = level
            break

    # Confidence stub — a real model would output a genuine probability
    confidence_score = 0.6 if category != "other" else 0.3

    return {
        "category": category,
        "severity": severity,
        "confidence_score": confidence_score,
        "needs_human_review": confidence_score < 0.5,
    }
