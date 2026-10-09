# Nova-Mind V4 Adaptive Execution Engine

Status: initial implementation scaffold on `feat/v4-adaptive-execution-engine`.

This document defines the first safe integration milestone. It does not claim that every modality is already connected to a real generation provider.

## Current milestone

- Add deterministic execution status transitions.
- Require evidence-backed acceptance before a task can be considered successful.
- Reject tool results that claim success without artifact references.
- Standardize failure classification, retry eligibility, and budget checks.
- Add unit tests for the deterministic kernel.
- Keep changes isolated on a feature branch for review.

## Architecture

```text
User/API
  -> Task Orchestrator
      -> TaskSpec + dependency plan
      -> Model adapter (planning / prompt compilation / review)
      -> Tool adapter registry (real providers and local executors)
      -> Artifact registry
      -> Deterministic validators
      -> Recovery manager
  -> Persistent task state + append-only task events
  -> Delivery report (artifacts, checks, limits, final status)
```

### Responsibilities

- **Orchestrator:** schedules steps and persists state transitions.
- **Model adapter:** proposes plans and transformations; it cannot independently mark tasks successful.
- **Tool adapter:** invokes a real provider or execution environment and returns structured status, external job IDs, artifacts, and errors.
- **Validator:** checks explicit acceptance criteria using deterministic tests wherever possible.
- **Recovery manager:** classifies failures, checks retry budgets, and resumes only affected steps.
- **Artifact registry:** stores durable URIs, media types, checksums, versions, and provenance.
- **Task store:** persists tasks, steps, dependencies, attempts, tool runs, acceptance checks, and events.

## Status contract

Allowed status names:

`CREATED`, `PLANNING`, `READY`, `RUNNING`, `RETRYING`, `VERIFYING`, `SUCCEEDED`, `PARTIAL`, `BLOCKED`, `FAILED`, `CANCELLED`.

The status transition function in `server/services/executionEngineV4.ts` is the deterministic policy reference. The database orchestrator must validate a transition before committing it.

A task may be marked `SUCCEEDED` only when:
1. At least one real artifact reference is registered.
2. Every required acceptance check is `PASSED`.
3. No unresolved required dependency remains.
4. The persisted task state reflects the completed execution and validation.

A model response, URL-shaped string, prompt, or provider submission receipt is not sufficient proof of a generated asset.

## Provider integration contract

Each provider adapter should:
- Validate inputs before dispatch.
- Use an idempotency key where supported.
- Distinguish synchronous completion from asynchronous submission.
- Return `RUNNING` with an external job ID for in-progress jobs.
- Return `SUCCEEDED` only with actual artifact references.
- Return structured errors with stable codes and retryability.
- Persist provider request IDs, costs, timings, and safe diagnostic metadata.
- Never persist API secrets in task logs.

For asynchronous jobs, poll or receive callbacks until the provider reports completion or a timeout policy is reached. Before retrying an ambiguous timeout, query the provider using the existing external job ID or idempotency key to avoid duplicate charges.

## Acceptance strategy by modality

- **Image:** artifact existence, readable image, dimensions, file format, then semantic/visual review.
- **Music/audio:** real audio file, successful decode, duration and stream metadata, then listening/analysis checks.
- **Video:** real video file, successful decode, dimensions, duration, audio/video stream checks, then content and continuity review.
- **3D:** parse/open target format, mesh/material/texture checks, then target-application compatibility.
- **Code:** lint/type-check, unit tests, integration tests, security checks, build and runtime smoke test as appropriate.
- **Game:** build succeeds, launch succeeds, core interactions and win/lose states are exercised, assets resolve.
- **Composite tasks:** validate each artifact and then validate cross-artifact consistency.

Subjective model-based scoring is supplementary and must not replace deterministic checks for objective constraints.

## Persistence model to map onto existing tables

Before adding migrations, audit the current schema and reuse existing entities where possible.

Required logical records:
- Task: stable ID, goal/specification, status, owner, budget, timestamps.
- Step: task ID, stable step key, dependency references, input/output, attempt count, status.
- Tool run: step ID, provider/tool, idempotency key, external job ID, status, timings, cost, safe logs.
- Artifact: durable URI, media type, checksum, size, version, provenance.
- Acceptance check: expected condition, observed result, status, evidence reference.
- Event: state changes, retry decisions, provider updates, and validation results.

State changes and corresponding events should be committed transactionally where possible. External tool calls cannot generally be included in the database transaction; use idempotency and reconciliation for those boundaries.

## First implementation sequence

1. Run the new unit tests and TypeScript checks.
2. Trace existing creative request routes, database writes, and provider calls.
3. Fix false-success reporting in media generation before adding more media providers.
4. Map the logical records above onto the existing schema; add only necessary migrations.
5. Implement persistent task orchestration and atomic step claiming.
6. Add a provider registry and real adapters.
7. Add modality-specific validators and bounded recovery.
8. Test success, provider failure, ambiguous timeout, duplicate dispatch, process restart, and acceptance failure.
9. Enable the new engine behind a feature flag before routing existing production tasks through it.

## Current known limitation

The current media-generation implementation includes a path that asks an LLM to return a URL or file path and then stores the response as a completed result. This is not a real media-provider integration and must not be treated as proof that audio/video was generated. Replace it with actual provider adapters and acceptance checks; until then, report the capability as unavailable or blocked.

## Release gate

Do not enable V4 orchestration by default until:
- type checking and build pass;
- deterministic tests pass;
- no path can mark a task successful without required acceptance evidence;
- retries are bounded and idempotent;
- restart recovery has an integration test;
- current API behavior and existing data are preserved.
