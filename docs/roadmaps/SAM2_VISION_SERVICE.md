# Nova SAM 2 Vision Service

## Purpose
Run Meta SAM 2 as an isolated Python inference service. The Node application calls it through a provider-neutral HTTP client; PyTorch, CUDA, and model checkpoints stay outside the web process.

## Current state
- Node-side HTTP client and response validation: implemented in this branch.
- Client unit tests: added; execution is pending CI.
- Python inference service: not implemented.
- SAM 2 weights: not downloaded or deployed.
- GPU/CPU runtime: not provisioned.
- End-to-end image/video inference: not tested.

Do not display the capability as connected until `/health` returns `status: "ok"` and a real segmentation request produces stored mask artifacts.

## HTTP contract
`GET /health` returns JSON fields `status: "ok"`, `provider: "sam2"`, `model`, and `device`.

`POST /v1/segment` accepts `mediaUrl`, `mediaType`, and either normalized `points` or a `box` in normalized coordinates. Video requests may include `frameIndex`; the video predictor must retain per-session inference state and propagate masks through subsequent frames.

Returns artifact metadata with a durable mask URL. Do not return raw mask arrays through the tRPC layer.

## Runtime requirements
Meta SAM 2 upstream documents Python 3.10+, PyTorch 2.5.1+, and TorchVision 0.20.1+. GPU installation may require a compatible CUDA toolkit and compilation of an optional CUDA extension. Start with a small SAM 2.1 checkpoint and benchmark on actual deployment hardware.

## Security
- Only allow media URLs from Nova-owned object storage or an explicit allowlist; never fetch arbitrary user-supplied URLs.
- Enforce file size, duration, frame count, and decode limits.
- Authenticate service-to-service requests.
- Keep temporary media and inference state isolated by user/session; expire them after completion.
- Store masks and derived metadata in object storage; avoid logging media contents or signed URLs.
- Add queueing and concurrency limits before enabling video jobs.
- When unconfigured, report `not_configured`, never fake success.