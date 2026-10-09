# Nova-Mind V4 Adaptive Execution Engine

Status: active draft implementation on `feat/v4-adaptive-execution-engine`. The six-table migration, journal entry, and schema snapshot are committed on the feature branch. The opt-in worker and configured image provider adapter are wired, but CI/build, staging migration, async reconciliation, and acceptance validators remain unverified/incomplete. Do not enable in production.

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

## Persistence implementation status

Schema definitions now exist in `drizzle/schema.ts` for `agentTasks`, `agentTaskSteps`, `agentToolRuns`, `agentArtifacts`, `agentAcceptanceChecks`, and `agentTaskEvents`. `server/services/agentTaskStoreV4.ts` adds transactional task/step/check/event creation, owner-scoped reads, compare-and-set task transitions, and cancellation requests. The protected API exposes task submission, listing, details, and cancellation.

**Migration blocker:** the corresponding SQL migration has not yet been generated, reviewed, committed, or applied. These routes must not be used against a database until the migration is in place. A durable worker that claims and executes persisted steps is also not connected yet.

The intended persistence model is:

Required logical records:
- Task: stable ID, goal/specification, status, owner, budget, timestamps.
- Step: task ID, stable step key, dependency references, input/output, attempt count, status.
- Tool run: step ID, provider/tool, idempotency key, external job ID, status, timings, cost, safe logs.
- Artifact: durable URI, media type, checksum, size, version, provenance.
- Acceptance check: expected condition, observed result, status, evidence reference.
- Event: state changes, retry decisions, provider updates, and validation results.

State changes and corresponding events should be committed transactionally where possible. External tool calls cannot generally be included in the database transaction; use idempotency and reconciliation for those boundaries.

## Next implementation sequence

1. Generate and review the migration for the six V4 persistence tables; verify it against a disposable database before applying it to any shared environment.
2. Run TypeScript checks, deterministic tests, and a production build; fix all failures before proceeding.
3. Implement atomic dependency-aware step claiming, tool-run receipts, artifact persistence, and step completion/verification transitions.
4. Add a durable worker loop with cancellation checks, deadlines, bounded retries, and restart reconciliation.
5. Wire scoped action authorization into every execution entrypoint.
6. Add real provider adapters and modality-specific validators.
7. Test success, provider failure, ambiguous timeout, duplicate dispatch, process restart, cancellation, and acceptance failure.
8. Enable behind a feature flag only after the migration and recovery tests pass.

## Current known limitation

Image generation now has a real V4 adapter path through the configured built-in image service and durable storage. Music/audio/video/animation remain unavailable in the V4 registry unless a real provider adapter is configured; LLM-generated URL-shaped text is not an artifact. Image artifacts are persisted as UNVERIFIED until deterministic checks are implemented. The worker is a first implementation, not yet production-grade multi-process orchestration.

## Release gate

Do not enable V4 orchestration by default until:
- type checking and build pass;
- deterministic tests pass;
- no path can mark a task successful without required acceptance evidence;
- retries are bounded and idempotent;
- restart recovery has an integration test;
- current API behavior and existing data are preserved.
