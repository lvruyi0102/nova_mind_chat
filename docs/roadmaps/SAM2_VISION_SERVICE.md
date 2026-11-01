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

## Video tracking design (next implementation slice)

The upstream video predictor is stateful: initialize one inference state per decoded video, add the initial prompt with `add_new_points_or_box`, then consume `propagate_in_video` frame results. A video request must not be implemented by passing a video URL to the image predictor.

### Proposed bounded API

- `POST /v1/video/track`: authenticated, accepts one Nova-owned HTTPS video URL and one initial prompt (normalized point(s) and/or XYXY box).
- The service downloads only from the configured exact-host allowlist, rejects redirects, and enforces both a compressed-byte ceiling and decoded frame/duration ceilings.
- Decode into a per-job temporary frame directory. Do not pass arbitrary video containers or URLs directly into SAM 2's frame loader.
- Initialize a fresh predictor state for the job; never share an inference state between requests or users.
- Add the prompt to the selected initial frame, then propagate at most the configured frame budget. Persist each binary mask as a PNG artifact and return only artifact IDs, frame indexes, dimensions, and confidence metadata.
- In a `finally` cleanup path, call the predictor's state reset when available, release temporary frame files, and clear references to the inference state. GPU cache clearing is a deployment policy, not a substitute for state cleanup.
- Serialize access to a single loaded video predictor until a queue/concurrency policy is in place. Reject excess work rather than allowing unbounded GPU memory growth.
- Provide explicit cancellation and expiry before exposing long-running jobs to the UI.

### Initial resource ceilings (configurable)

Start conservatively with max 20 MiB input, 10 seconds decoded duration, 250 decoded frames, 1 active video job per worker, and a 15-minute artifact/session TTL. These are guardrails for the first test deployment, not performance guarantees. Benchmark on the actual host before increasing them.

### Acceptance gates

1. Unit tests validate URL allowlisting, size/duration/frame ceilings, prompt coordinate conversion, and per-job state isolation using a fake predictor.
2. Contract tests verify unauthenticated calls fail, oversized/overlong videos are rejected, and unsupported codecs return a controlled client error.
3. A real checkpoint + real short video smoke test verifies stable frame ordering, correct mask dimensions, and cleanup after success and failure.
4. No UI capability is marked connected until the real smoke test passes and artifacts are stored in Nova-owned durable storage.

The upstream predictor's documented workflow uses `init_state`, `add_new_points_or_box`, and `propagate_in_video`; pin the SAM 2 package revision before implementing against its exact API. See the official upstream predictor implementation: https://github.com/facebookresearch/sam2/blob/main/sam2/sam2_video_predictor.py.
