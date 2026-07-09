"""
Risk scoring engine for safe navigation and heatmap generation.

Combines:
- Spatial clustering of incident reports (DBSCAN/HDBSCAN)
- Time-of-day weighting
- (Optional) external data like lighting/foot-traffic if available

This base setup provides a functional stub with clear extension points
for plugging in a trained model and real incident data from the DB.
"""

from typing import Dict, List
import math
import random


def haversine_distance(lat1, lng1, lat2, lng2) -> float:
    """Distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def compute_safety_score(path_points: List[Dict], incident_data: List[Dict] = None) -> float:
    """
    Placeholder scoring function: 0 (very unsafe) - 100 (very safe).

    Real implementation should:
    1. Query incident_reports within a buffer radius of each path point
    2. Weight by recency and time-of-day match
    3. Factor in lighting/foot-traffic data if available
    4. Aggregate into a single 0-100 score
    """
    # Stub: random but stable-ish score based on point count, for local testing
    base_score = 70
    penalty = min(len(path_points) * 0.5, 20)
    return round(base_score - penalty + random.uniform(-5, 5), 1)


def score_routes(origin: Dict, destination: Dict) -> Dict:
    """
    Placeholder: In production this should call a routing engine (Mapbox/OSRM)
    to get 2-3 candidate paths, then score each with compute_safety_score().
    """
    candidate_routes = [
        {"id": "route_1", "label": "Fastest", "path_points": [origin, destination]},
        {"id": "route_2", "label": "Well-lit / high foot traffic", "path_points": [origin, destination]},
        {"id": "route_3", "label": "Safest (AI-ranked)", "path_points": [origin, destination]},
    ]

    scored = []
    for route in candidate_routes:
        score = compute_safety_score(route["path_points"])
        scored.append({**route, "safety_score": score})

    scored.sort(key=lambda r: r["safety_score"], reverse=True)
    return {"routes": scored}


def get_heatmap(min_lat: float, min_lng: float, max_lat: float, max_lng: float) -> Dict:
    """
    Placeholder: Query incident_reports within the bounding box, run spatial
    clustering (DBSCAN/HDBSCAN), and return risk zones with intensity scores.
    """
    # Stub: return a few sample zones within the bounding box for local testing
    zones = []
    for i in range(3):
        lat = min_lat + (max_lat - min_lat) * random.random()
        lng = min_lng + (max_lng - min_lng) * random.random()
        zones.append({"lat": lat, "lng": lng, "risk_intensity": round(random.uniform(0.2, 0.9), 2)})

    return {"zones": zones}
