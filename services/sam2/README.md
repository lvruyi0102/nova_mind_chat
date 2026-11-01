# Nova SAM 2 service (image-first)

This is an isolated Python inference service. It deliberately does **not** download model weights automatically, and it reports `not_ready` until a real checkpoint is present.

## Install

Use Python 3.10+ in an isolated environment. Install a PyTorch and TorchVision build matching the host (CPU or the host's CUDA runtime), then install Meta's official SAM 2 package from https://github.com/facebookresearch/sam2. Install this service's lightweight dependencies with:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env`, set a strong shared token, and configure the exact HTTPS hostname(s) for Nova-owned object storage. Download a SAM 2.1 small checkpoint through Meta's official instructions and set `SAM2_CHECKPOINT` to its local path. The default config is `configs/sam2.1/sam2.1_hiera_s.yaml`.

Run with:

```bash
uvicorn app:app --host 0.0.0.0 --port 8080
```

## API

- `GET /health`: reports `not_ready` until the checkpoint exists; reports `ok` only when the checkpoint file is present.
- `POST /v1/segment`: authenticated JSON request compatible with Nova's Node client. Supports image segmentation with normalized point prompts and/or normalized XYXY box.
- `GET /artifacts/{id}.png`: serves the generated binary mask. Put this service behind private networking or an authenticated artifact gateway before production use.

Example request body:

```json
{
  "mediaUrl": "https://storage.example.com/private/image.jpg",
  "mediaType": "image",
  "points": [{"x": 0.5, "y": 0.5, "label": 1}]
}
```

## Security and limits

The service requires `NOVA_VISION_SERVICE_TOKEN`; only HTTPS media URLs whose exact host appears in `SAM2_ALLOWED_MEDIA_HOSTS` are fetched; redirects are disabled; payload size is capped. Use a private network, short-lived storage URLs, a durable object store for artifacts, rate limits, and per-user authorization before exposing it beyond a trusted development environment.

## Explicit scope boundary

This first executable slice handles **single images only**. Video tracking, durable cloud artifact storage, user/session authorization, GPU provisioning, deployment, and end-to-end production validation remain future work. A local artifact directory is not durable object storage.

## Prompt coordinate convention

The API accepts normalized coordinates in the range 0..1, with the origin at the top-left. The service converts points and XYXY boxes to source-image pixel coordinates before calling the SAM 2 predictor. Positive point labels select the object; zero labels mark background. Do not send pixel coordinates to this API.

For GPU inference, the service uses BF16 autocast on CUDA and standard inference mode on CPU. Actual speed and memory requirements depend on the selected checkpoint and host.
