from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

MAX_VIDEO_BYTES = int(os.getenv("SAM2_MAX_VIDEO_BYTES", str(20 * 1024 * 1024)))
MAX_VIDEO_SECONDS = float(os.getenv("SAM2_MAX_VIDEO_SECONDS", "10"))
MAX_VIDEO_FRAMES = int(os.getenv("SAM2_MAX_VIDEO_FRAMES", "250"))


class VideoLimitError(ValueError):
    pass


class VideoCancelled(RuntimeError):
    pass


def decode_video_frames(video_path: str | Path, frame_dir: str | Path) -> dict[str, Any]:
    """Decode a bounded video into SAM2's numbered JPEG frame-directory format."""
    source = Path(video_path)
    if not source.is_file():
        raise VideoLimitError("Video file does not exist.")
    if source.stat().st_size > MAX_VIDEO_BYTES:
        raise VideoLimitError("Video exceeds the configured byte limit.")

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise VideoLimitError("Video codec or container could not be opened.")
    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
        reported_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if fps <= 0 or reported_frames <= 0:
            raise VideoLimitError("Video metadata is missing a valid frame rate or frame count.")
        duration = reported_frames / fps
        if duration > MAX_VIDEO_SECONDS:
            raise VideoLimitError("Video exceeds the configured duration limit.")
        # Keep every frame when within budget; otherwise uniformly sample no more than the cap.
        sample_step = max(1, int(np.ceil(reported_frames / MAX_VIDEO_FRAMES)))
        output = Path(frame_dir)
        output.mkdir(parents=True, exist_ok=True)
        saved, index = 0, 0
        source_width = source_height = 0
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            if source_width == 0:
                source_height, source_width = frame.shape[:2]
            if index % sample_step == 0:
                if saved >= MAX_VIDEO_FRAMES:
                    raise VideoLimitError("Decoded video exceeds the configured frame limit.")
                target = output / f"{saved:05d}.jpg"
                # OpenCV decodes BGR; SAM 2 expects RGB image files.
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                Image.fromarray(rgb_frame).save(target, format="JPEG", quality=92)
                saved += 1
            index += 1
        if saved == 0:
            raise VideoLimitError("Video contains no decodable frames.")
        return {"frameCount": saved, "sourceFrameCount": index, "fps": fps / sample_step, "durationSeconds": index / fps, "width": source_width, "height": source_height}
    finally:
        capture.release()


def track_video_with_sam2(
    predictor: Any,
    frame_dir: str | Path,
    width: int,
    height: int,
    points: list[dict[str, float | int]] | None,
    box: tuple[float, float, float, float] | None,
    artifact_dir: str | Path,
    cancel_check: Any | None = None,
) -> list[dict[str, Any]]:
    """Run one isolated SAM2 video state and persist one PNG mask per propagated frame."""
    if not points and not box:
        raise ValueError("At least one point prompt or a bounding box is required.")
    if width <= 0 or height <= 0:
        raise ValueError("Video dimensions must be positive.")
    job_dir = Path(artifact_dir) / str(uuid.uuid4())
    job_dir.mkdir(parents=True, exist_ok=False)
    state = None
    results: list[dict[str, Any]] = []
    try:
        state = predictor.init_state(video_path=str(frame_dir), offload_video_to_cpu=True, offload_state_to_cpu=True)
        point_coords = np.array([[float(p["x"]) * width, float(p["y"]) * height] for p in points], dtype=np.float32) if points else None
        point_labels = np.array([int(p["label"]) for p in points], dtype=np.int32) if points else None
        pixel_box = np.array([box[0] * width, box[1] * height, box[2] * width, box[3] * height], dtype=np.float32) if box else None
        predictor.add_new_points_or_box(
            inference_state=state,
            frame_idx=0,
            obj_id=1,
            points=point_coords,
            labels=point_labels,
            box=pixel_box,
            normalize_coords=True,
        )
        for frame_idx, object_ids, masks in predictor.propagate_in_video(state, start_frame_idx=0):
            if cancel_check is not None and cancel_check():
                raise VideoCancelled("Video job was cancelled.")
            mask_array = masks[0].detach().float().cpu().numpy()
            mask_array = np.squeeze(mask_array)
            if mask_array.ndim != 2:
                raise RuntimeError("SAM2 returned an unexpected video mask shape.")
            mask = (mask_array > 0).astype(np.uint8) * 255
            artifact_id = str(uuid.uuid4())
            Image.fromarray(mask, mode="L").save(job_dir / f"{artifact_id}.png", format="PNG")
            results.append({
                "objectId": artifact_id,
                "frameIndex": int(frame_idx),
                "width": int(mask.shape[1]),
                "height": int(mask.shape[0]),
                "maskPath": str(job_dir / f"{artifact_id}.png"),
            })
        if not results:
            raise RuntimeError("SAM2 did not return any tracked frames.")
        return results
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    finally:
        if state is not None:
            try:
                predictor.reset_state(state)
            except Exception:
                # Preserve the original inference exception; worker recycling is the final safety net.
                pass
