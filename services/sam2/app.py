from __future__ import annotations

import io
import json
import os
import secrets
import shutil
import sqlite3
import tempfile
import threading
import time
import uuid
from contextlib import nullcontext
from pathlib import Path
from urllib.parse import urlparse

import httpx
import numpy as np
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
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
_video_jobs_lock = threading.Lock()
_video_cancel_events: dict[str, threading.Event] = {}
_video_worker_lock = threading.Lock()
MAX_VIDEO_BYTES = int(os.getenv('SAM2_MAX_VIDEO_BYTES', str(20 * 1024 * 1024)))


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



class VideoTrackRequest(BaseModel):
    mediaUrl: str = Field(min_length=1, max_length=2048)
    points: list[Point] | None = Field(default=None, max_length=16)
    box: tuple[float, float, float, float] | None = None

    @model_validator(mode="after")
    def validate_prompt(self):
        if not self.points and not self.box:
            raise ValueError("Provide at least one point or a box.")
        if self.box and not (0 <= self.box[0] < self.box[2] <= 1 and 0 <= self.box[1] < self.box[3] <= 1):
            raise ValueError("Box must be normalized XYXY coordinates within [0,1].")
        return self


def download_trusted_video(url: str, destination: Path) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.hostname.lower() not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="Media URL host is not allowlisted.")
    if parsed.username or parsed.password or parsed.port not in (None, 443):
        raise HTTPException(status_code=400, detail="Media URL is not permitted.")
    total = 0
    try:
        with httpx.Client(timeout=30, follow_redirects=False) as client:
            with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Could not retrieve video from trusted storage.")
                length = int(response.headers.get("content-length", "0") or "0")
                if length > MAX_VIDEO_BYTES:
                    raise HTTPException(status_code=413, detail="Video exceeds the configured byte limit.")
                with destination.open("wb") as output:
                    for chunk in response.iter_bytes():
                        total += len(chunk)
                        if total > MAX_VIDEO_BYTES:
                            raise HTTPException(status_code=413, detail="Video exceeds the configured byte limit.")
                        output.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not retrieve video: {type(exc).__name__}") from exc


def get_video_predictor():
    if INFERENCE_IMPORT_ERROR:
        raise HTTPException(status_code=503, detail="PyTorch or SAM 2 inference package is not installed.")
    if not CHECKPOINT or not Path(CHECKPOINT).is_file():
        raise HTTPException(status_code=503, detail="SAM 2 checkpoint is not installed.")
    try:
        from sam2.build_sam import build_sam2_video_predictor
        return build_sam2_video_predictor(MODEL_CONFIG, CHECKPOINT, device=DEVICE)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"SAM 2 video model failed to load: {type(exc).__name__}") from exc


JOB_DB = Path(os.getenv('SAM2_JOB_DB', ARTIFACT_DIR / 'video-jobs.sqlite3'))
ARTIFACT_TTL_SECONDS = int(os.getenv('SAM2_ARTIFACT_TTL_SECONDS', '3600'))
JOB_TTL_SECONDS = int(os.getenv('SAM2_JOB_TTL_SECONDS', '86400'))

def db_connect():
    JOB_DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(JOB_DB, timeout=10)
    db.row_factory = sqlite3.Row
    return db

def init_job_store():
    with db_connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS video_jobs (job_id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at REAL NOT NULL, updated_at REAL NOT NULL, error TEXT, result_json TEXT)')
        db.execute("UPDATE video_jobs SET status='interrupted', error='Service restarted before this in-memory task completed.' WHERE status IN ('queued','running','cancelling')")

def save_job(job_id, status, error=None, result=None):
    now = time.time()
    encoded = json.dumps(result) if result is not None else None
    with db_connect() as db:
        db.execute('INSERT INTO video_jobs VALUES(?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at, error=excluded.error, result_json=excluded.result_json', (job_id,status,now,now,error,encoded))

def read_job(job_id):
    with db_connect() as db:
        row = db.execute('SELECT * FROM video_jobs WHERE job_id=?', (job_id,)).fetchone()
    if row is None: return None
    job = {'jobId': row['job_id'], 'status': row['status']}
    if row['error']: job['error'] = row['error']
    if row['result_json']: job['result'] = json.loads(row['result_json'])
    return job

def cleanup_expired_data():
    now = time.time()
    with db_connect() as db:
        db.execute('DELETE FROM video_jobs WHERE updated_at < ?', (now-JOB_TTL_SECONDS,))
    for path in ARTIFACT_DIR.glob('*.png'):
        try:
            if path.is_file() and path.stat().st_mtime < now-ARTIFACT_TTL_SECONDS: path.unlink()
        except OSError: pass
    for path in ARTIFACT_DIR.iterdir():
        if path.is_dir():
            try:
                if path.stat().st_mtime < now-ARTIFACT_TTL_SECONDS: shutil.rmtree(path, ignore_errors=True)
            except OSError: pass

init_job_store()

def run_video_job(job_id: str, payload: VideoTrackRequest) -> None:
    from video_pipeline import VideoCancelled, VideoLimitError, decode_video_frames, track_video_with_sam2
    save_job(job_id, 'running')
    if not _video_worker_lock.acquire(blocking=False):
        save_job(job_id, 'rejected', 'Video worker is busy; retry later.')
        return
    cancel_event = _video_cancel_events.get(job_id, threading.Event())
    try:
        with tempfile.TemporaryDirectory(prefix='nova-sam2-video-') as temp:
            root = Path(temp); source = root / 'source-video'; frames = root / 'frames'
            if cancel_event.is_set(): raise VideoCancelled('Video job was cancelled.')
            download_trusted_video(payload.mediaUrl, source)
            metadata = decode_video_frames(source, frames)
            with Image.open(frames / '00000.jpg') as first_frame: width, height = first_frame.size
            predictor = get_video_predictor()
            points = [point.model_dump() for point in payload.points] if payload.points else None
            tracked = track_video_with_sam2(predictor, frames, width, height, points, payload.box, ARTIFACT_DIR, cancel_check=cancel_event.is_set)
            artifacts = []
            for item in tracked:
                if cancel_event.is_set(): raise VideoCancelled('Video job was cancelled.')
                artifact_id = item['objectId']; shutil.copyfile(item['maskPath'], ARTIFACT_DIR / (artifact_id + '.png'))
                artifacts.append({'objectId':artifact_id,'frameIndex':item['frameIndex'],'width':item['width'],'height':item['height'],'maskUrl':'/artifacts/'+artifact_id+'.png'})
            save_job(job_id, 'completed', result={'provider':'sam2','model':MODEL_NAME,'mediaType':'video','video':metadata,'artifacts':artifacts})
    except VideoCancelled as exc: save_job(job_id, 'cancelled', str(exc))
    except (HTTPException, VideoLimitError) as exc: save_job(job_id, 'failed', getattr(exc, 'detail', str(exc)))
    except Exception as exc: save_job(job_id, 'failed', 'Video tracking failed: '+type(exc).__name__)
    finally:
        _video_worker_lock.release(); _video_cancel_events.pop(job_id, None); cleanup_expired_data()

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
    try:
        get_predictor()
        ready = True
    except HTTPException:
        ready = False
    return {"status": "ok" if ready else "not_ready", "provider": "sam2", "model": MODEL_NAME if ready else None, "device": DEVICE if ready else None}


@app.post("/v1/segment")
async def segment(payload: SegmentRequest, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    started = time.perf_counter()
    image = await load_trusted_image(payload.mediaUrl)
    predictor = get_predictor()
    width, height = image.size
    point_coords = np.array([[p.x * width, p.y * height] for p in payload.points], dtype=np.float32) if payload.points else None
    point_labels = np.array([p.label for p in payload.points], dtype=np.int32) if payload.points else None
    box = np.array([payload.box[0] * width, payload.box[1] * height, payload.box[2] * width, payload.box[3] * height], dtype=np.float32) if payload.box else None
    try:
        predictor.set_image(np.asarray(image))
        amp_context = torch.autocast(device_type="cuda", dtype=torch.bfloat16) if DEVICE.startswith("cuda") else nullcontext()
        with torch.inference_mode(), amp_context:
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
def get_artifact(filename: str, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    if not filename.endswith(".png") or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    path = ARTIFACT_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return FileResponse(path, media_type="image/png")


@app.post("/v1/video/track", status_code=202)
def start_video_track(payload: VideoTrackRequest, background_tasks: BackgroundTasks, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    job_id = str(uuid.uuid4())
    cleanup_expired_data()
    save_job(job_id, 'queued')
    _video_cancel_events[job_id] = threading.Event()
    background_tasks.add_task(run_video_job, job_id, payload)
    return {"jobId": job_id, "status": "queued"}


@app.get("/v1/video/jobs/{job_id}")
def get_video_job(job_id: str, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    try:
        uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Video job not found.")
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found.")
    return job


@app.post('/v1/video/jobs/{job_id}/cancel')
def cancel_video_job(job_id: str, authorization: str | None = Header(default=None)):
    require_service_auth(authorization)
    try: uuid.UUID(job_id)
    except ValueError: raise HTTPException(status_code=404, detail='Video job not found.')
    job = read_job(job_id)
    if not job: raise HTTPException(status_code=404, detail='Video job not found.')
    if job['status'] in {'completed','failed','rejected','cancelled','interrupted'}: return job
    event = _video_cancel_events.get(job_id)
    if event: event.set()
    save_job(job_id, 'cancelling')
    return {'jobId':job_id,'status':'cancelling'}
