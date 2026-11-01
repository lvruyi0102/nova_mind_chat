from __future__ import annotations

import io
import os
import secrets
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator
from PIL import Image
try:
    import torch
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    INFERENCE_IMPORT_ERROR = None
except ImportError as exc:
    torch = None
    build_sam2 = None
    SAM2ImagePredictor = None
    INFERENCE_IMPORT_ERROR = type(exc).__name__

APP_DIR = Path(__file__).resolve().parent
ARTIFACT_DIR = Path(os.getenv("SAM2_ARTIFACT_DIR", APP_DIR / "artifacts"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
MAX_MEDIA_BYTES = int(os.getenv("SAM2_MAX_MEDIA_BYTES", str(15 * 1024 * 1024)))
ALLOWED_HOSTS = {h.strip().lower() for h in os.getenv("SAM2_ALLOWED_MEDIA_HOSTS", "").split(",") if h.strip()}
SERVICE_TOKEN = os.getenv("NOVA_VISION_SERVICE_TOKEN", "")
MODEL_NAME = os.getenv("SAM2_MODEL_NAME", "sam2.1_hiera_small")
MODEL_CONFIG = os.getenv("SAM2_MODEL_CONFIG", "configs/sam2.1/sam2.1_hiera_s.yaml")
CHECKPOINT = os.getenv("SAM2_CHECKPOINT", "")
DEVICE = os.getenv("SAM2_DEVICE", "cuda" if torch is not None and torch.cuda.is_available() else "cpu")

app = FastAPI(title="Nova SAM 2 Vision Service", version="0.1.0")
_predictor: SAM2ImagePredictor | None = None


class Point(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    label: int = Field(ge=0, le=1)


class SegmentRequest(BaseModel):
    mediaUrl: str = Field(min_length=1, max_length=2048)
    mediaType: str = "image"
    points: list[Point] | None = Field(default=None, max_length=32)
    box: tuple[float, float, float, float] | None = None
    frameIndex: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_prompt(self):
        if self.mediaType != "image":
            raise ValueError("This first service version supports image segmentation only; video tracking is not enabled.")
        if not self.points and not self.box:
            raise ValueError("Provide at least one point or a box.")
        if self.box and not (0 <= self.box[0] < self.box[2] <= 1 and 0 <= self.box[1] < self.box[3] <= 1):
            raise ValueError("Box must be normalized XYXY coordinates within [0,1].")
        return self


def require_service_auth(authorization: str | None):
    if not SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="Service authentication is not configured.")
    expected = "Bearer " + SERVICE_TOKEN
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_predictor():
    global _predictor
    if _predictor is not None:
        return _predictor
    if INFERENCE_IMPORT_ERROR:
        raise HTTPException(status_code=503, detail="PyTorch or SAM 2 inference package is not installed.")
    if not CHECKPOINT or not Path(CHECKPOINT).is_file():
        raise HTTPException(status_code=503, detail="SAM 2 checkpoint is not installed.")
    try:
        model = build_sam2(MODEL_CONFIG, CHECKPOINT, device=DEVICE)
        _predictor = SAM2ImagePredictor(model)
        return _predictor
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"SAM 2 model failed to load: {type(exc).__name__}") from exc


async def load_trusted_image(url: str) -> Image.Image:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.hostname.lower() not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="Media URL host is not allowlisted.")
    if parsed.username or parsed.password or parsed.port not in (None, 443):
        raise HTTPException(status_code=400, detail="Media URL is not permitted.")
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Could not retrieve media from trusted storage.")
                length = int(response.headers.get("content-length", "0") or "0")
                if length > MAX_MEDIA_BYTES:
                    raise HTTPException(status_code=413, detail="Media exceeds the configured size limit.")
                chunks, total = [], 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > MAX_MEDIA_BYTES:
                        raise HTTPException(status_code=413, detail="Media exceeds the configured size limit.")
                    chunks.append(chunk)
        image = Image.open(io.BytesIO(b"".join(chunks)))
        image.load()
        return image.convert("RGB")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image media: {type(exc).__name__}") from exc


@app.get("/health")
def health():
    ready = bool(INFERENCE_IMPORT_ERROR is None and CHECKPOINT and Path(CHECKPOINT).is_file())
    return {"status": "ok" if ready else "not_ready", "provider": "sam2", "model": MODEL_NAME if ready else None, "device": DEVICE if ready else None}


@app.post("/v1/segment")
async def segment(payload: SegmentRequest, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    started = time.perf_counter()
    image = await load_trusted_image(payload.mediaUrl)
    predictor = get_predictor()
    width, height = image.size
    point_coords = np.array([[p.x, p.y] for p in payload.points], dtype=np.float32) if payload.points else None
    point_labels = np.array([p.label for p in payload.points], dtype=np.int32) if payload.points else None
    box = np.array(payload.box, dtype=np.float32) if payload.box else None
    try:
        predictor.set_image(np.asarray(image))
        with torch.inference_mode():
            masks, scores, _ = predictor.predict(point_coords=point_coords, point_labels=point_labels, box=box, multimask_output=True, normalize_coords=True)
        best = int(np.argmax(scores))
        mask = (masks[best].astype(np.uint8) * 255)
        object_id = str(uuid.uuid4())
        artifact_path = ARTIFACT_DIR / f"{object_id}.png"
        Image.fromarray(mask, mode="L").save(artifact_path, format="PNG")
    finally:
        predictor.reset_predictor()
    return {"provider": "sam2", "model": MODEL_NAME, "mediaType": "image", "artifacts": [{"objectId": object_id, "frameIndex": 0, "width": width, "height": height, "maskUrl": f"/artifacts/{object_id}.png", "confidence": float(scores[best])}], "processingMs": int((time.perf_counter() - started) * 1000)}


@app.get("/artifacts/{filename}")
def get_artifact(filename: str):
    if not filename.endswith(".png") or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    path = ARTIFACT_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return FileResponse(path, media_type="image/png")
