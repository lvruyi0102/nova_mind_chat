# Nova SAM 2 Vision Service

## Purpose
Run Meta SAM 2 as an isolated Python inference service. The Node application calls it through a provider-neutral HTTP client; PyTorch, CUDA, and model checkpoints stay outside the web process.

## Current state
- Node-side HTTP client and response validation: implemented in this branch.
- Client unit tests: added; execution is pending CI.
- Python FastAPI service skeleton and image inference endpoint: implemented in `services/sam2/`; requires PyTorch, the official SAM 2 package, a checkpoint, and configured trusted storage before it can run inference.
- Lightweight service contract tests and a dedicated GitHub Actions workflow: added; execution result is pending.
- SAM 2 weights: not downloaded or deployed.
- GPU/CPU runtime: not provisioned.
- End-to-end image inference: not tested. Video tracking: explicitly unsupported in this first slice.

Do not display the capability as connected until `/health` returns `status: "ok"` and a real segmentation request produces stored mask artifacts.

## HTTP contract
`GET /health` returns JSON fields `status: "ok"`, `provider: "sam2"`, `model`, and `device`.

`POST /v1/segment` accepts authenticated JSON (`Authorization: Bearer ...`), `mediaUrl`, `mediaType: "image"`, and either normalized `points` or a normalized XYXY `box`. This first implementation rejects video requests. The service fetches only HTTPS URLs whose exact hostname is in `SAM2_ALLOWED_MEDIA_HOSTS`, with redirects disabled and a byte limit.

Returns artifact metadata and a local `/artifacts/{id}.png` URL. This local artifact directory is not durable cloud storage; production must replace it with Nova-owned object storage and an authenticated artifact gateway. Do not return raw mask arrays through the tRPC layer.

## Runtime requirements
Meta SAM 2 upstream documents Python 3.10+, PyTorch 2.5.1+, and TorchVision 0.20.1+. GPU installation may require a compatible CUDA toolkit and compilation of an optional CUDA extension. Start with a small SAM 2.1 checkpoint and benchmark on actual deployment hardware.

## Security
- Only allow media URLs from Nova-owned object storage or an explicit allowlist; never fetch arbitrary user-supplied URLs.
- Enforce file size, duration, frame count, and decode limits.
- Authenticate service-to-service requests with `NOVA_VISION_SERVICE_TOKEN`.
- Keep the artifact endpoint behind private networking or an authenticated gateway; the starter endpoint is not a complete production authorization layer.
- Keep temporary media and inference state isolated by user/session; expire them after completion.
- Store masks and derived metadata in object storage; avoid logging media contents or signed URLs.
- Add queueing and concurrency limits before enabling video jobs.
- When unconfigured, report `not_configured`, never fake success.