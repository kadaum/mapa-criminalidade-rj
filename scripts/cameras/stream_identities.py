"""Validate and apply the final curated Homes stream identity overlay."""
import json
from pathlib import Path
from urllib.parse import urlparse

IDENTITY_PATH = Path(__file__).resolve().parents[2] / "research/cameras/stream-identities.json"
EXPECTED_PAGES = {
    "homes-posto-3": "https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam",
    "homes-posto-6": "https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam",
}
ALLOWED_OUTCOMES = {"playing", "ended", "unavailable", "unknown"}


def validate_identities(document):
    if (not isinstance(document, dict)
            or set(document) != {"schemaVersion", "cameras"}
            or type(document["schemaVersion"]) is not int
            or document["schemaVersion"] != 1):
        raise ValueError("Invalid curated stream identity document")
    rows = document["cameras"]
    ids = [row.get("id") for row in rows] if isinstance(rows, list) else []
    if (not isinstance(rows, list) or not all(isinstance(camera_id, str) for camera_id in ids)
            or len(ids) != len(EXPECTED_PAGES)
            or len(set(ids)) != len(ids) or set(ids) != set(EXPECTED_PAGES)):
        raise ValueError("Curated stream identities must contain exactly the two Homes cameras")
    validated = {}
    for row in rows:
        if set(row) != {"id", "source", "streamResolver", "historicalStreams"}:
            raise ValueError(f"Invalid identity fields for {row.get('id')}")
        camera_id = row["id"]
        source = row["source"]
        parsed = urlparse(source)
        if (row["streamResolver"] != camera_id or source != EXPECTED_PAGES[camera_id]
                or parsed.scheme != "https" or parsed.hostname != "homesinrio.com"
                or parsed.username or parsed.password or parsed.query or parsed.fragment):
            raise ValueError(f"Invalid fixed operator identity for {camera_id}")
        history = row["historicalStreams"]
        if not isinstance(history, list):
            raise ValueError(f"Invalid history for {camera_id}")
        for item in history:
            if (set(item) - {"provider", "streamId", "lastObservedAt", "outcome"}
                    or item.get("provider") != "youtube"
                    or not isinstance(item.get("streamId"), str)
                    or len(item["streamId"]) != 11
                    or item.get("outcome") not in ALLOWED_OUTCOMES):
                raise ValueError(f"Invalid historical stream for {camera_id}")
        validated[camera_id] = row
    return validated


def load_identities(path=IDENTITY_PATH):
    return validate_identities(json.loads(Path(path).read_text(encoding="utf-8")))


def apply_stream_identities(cameras, identities):
    by_id = {camera["id"]: camera for camera in cameras}
    missing = set(identities) - set(by_id)
    if missing:
        raise ValueError("Missing curated resolver camera(s): " + ", ".join(sorted(missing)))
    for camera_id, identity in identities.items():
        camera = by_id[camera_id]
        camera["source"] = identity["source"]
        camera["streamResolver"] = identity["streamResolver"]
        camera["historicalStreams"] = identity["historicalStreams"]
        camera.pop("youtubeId", None)
        camera.pop("watchUrl", None)
    return cameras
