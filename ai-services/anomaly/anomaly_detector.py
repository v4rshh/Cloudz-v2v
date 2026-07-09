"""
Movement anomaly detection for "Follow Me" sessions.

Detects patterns like:
- Sudden prolonged stop
- Erratic backtracking / deviation from expected path
- Abrupt speed spikes

Base setup uses simple rule-based thresholds as a stub. Replace with an
Isolation Forest (scikit-learn) or a lightweight statistical model trained
on real trip data for production use.
"""

from typing import List, Dict
from datetime import datetime

STOP_DURATION_THRESHOLD_SECONDS = 120  # 2 minutes stationary triggers a soft check-in


def check_anomaly(session_id: str, location_trail: List[Dict]) -> Dict:
    """
    location_trail: list of { lat, lng, timestamp } in chronological order.

    Returns:
        { anomaly_detected: bool, reason: str | None, recommended_action: str }
    """
    if len(location_trail) < 2:
        return {"anomaly_detected": False, "reason": None, "recommended_action": "none"}

    last_point = location_trail[-1]
    prev_point = location_trail[-2]

    # Rule 1: prolonged stop detection
    stop_duration = _seconds_between(prev_point["timestamp"], last_point["timestamp"])
    same_location = _is_same_location(prev_point, last_point)

    if same_location and stop_duration >= STOP_DURATION_THRESHOLD_SECONDS:
        return {
            "anomaly_detected": True,
            "reason": "User has been stationary at the same location for an extended period.",
            "recommended_action": "soft_check_in",
        }

    # TODO: add deviation-from-route detection, speed-spike detection, etc.
    return {"anomaly_detected": False, "reason": None, "recommended_action": "none"}


def _seconds_between(ts1: str, ts2: str) -> float:
    try:
        t1 = datetime.fromisoformat(ts1)
        t2 = datetime.fromisoformat(ts2)
        return abs((t2 - t1).total_seconds())
    except Exception:
        return 0.0


def _is_same_location(p1: Dict, p2: Dict, tolerance: float = 0.0005) -> bool:
    """~50m tolerance in lat/lng degrees (rough approximation)."""
    return abs(p1["lat"] - p2["lat"]) < tolerance and abs(p1["lng"] - p2["lng"]) < tolerance
