import os
from fastapi.testclient import TestClient

os.environ.setdefault("NOVA_VISION_SERVICE_TOKEN", "test-secret")
from app import app

client = TestClient(app)


def test_health_never_claims_ready_without_checkpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["provider"] == "sam2"
    assert response.json()["status"] in {"ok", "not_ready"}
    if not os.getenv("SAM2_CHECKPOINT"):
        assert response.json()["status"] == "not_ready"


def test_segment_requires_authentication():
    response = client.post("/v1/segment", json={
        "mediaUrl": "https://storage.example.com/image.jpg",
        "mediaType": "image",
        "points": [{"x": 0.5, "y": 0.5, "label": 1}],
    })
    assert response.status_code == 401


def test_video_is_explicitly_not_supported_yet():
    response = client.post("/v1/segment", headers={"Authorization": "Bearer test-secret"}, json={
        "mediaUrl": "https://storage.example.com/video.mp4",
        "mediaType": "video",
        "points": [{"x": 0.5, "y": 0.5, "label": 1}],
    })
    assert response.status_code == 422


def test_artifacts_require_authentication():
    response = client.get("/artifacts/not-a-real-mask.png")
    assert response.status_code == 401


def test_video_track_requires_authentication():
    response = client.post("/v1/video/track", json={
        "mediaUrl": "https://storage.example.com/clip.mp4",
        "points": [{"x": 0.5, "y": 0.5, "label": 1}],
    })
    assert response.status_code == 401


def test_video_track_requires_a_prompt():
    response = client.post("/v1/video/track", headers={"Authorization": "Bearer test-secret"}, json={
        "mediaUrl": "https://storage.example.com/clip.mp4",
    })
    assert response.status_code == 422


def test_video_job_lookup_rejects_unknown_job():
    response = client.get(
        "/v1/video/jobs/123e4567-e89b-12d3-a456-426614174000",
        headers={"Authorization": "Bearer test-secret"},
    )
    assert response.status_code == 404
