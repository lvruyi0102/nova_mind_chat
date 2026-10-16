# Nova-Mind Growth Roadmap: from assistant to reliable autonomous agent

## North-star

Build a capable, persistent, multimodal agent that can understand goals, plan, use registered tools, verify results, learn from outcomes, and resume work after interruption. This is an engineering roadmap, not a claim that a current system has achieved AGI or consciousness.

## Design principles

1. **Evidence over assertion.** A model may propose a plan or explain an outcome; only tool receipts, persisted state, artifact checks, and validators determine what actually happened.
2. **Continuity through storage, not prompt claims.** Identity, memory, goals, preferences, decisions, and task progress must be retrieved from versioned durable records. Never claim a memory was loaded unless retrieval confirms it.
3. **Bounded autonomy.** The system may plan and perform low-risk, reversible actions within configured budgets. External communication, financial operations, destructive changes, credential/security changes, and production deployments require explicit scoped authorization.
4. **Tool truthfulness.** An unavailable capability is reported as blocked/unavailable. A prompt, URL-shaped string, or generated description is not a media artifact.
5. **Recoverable execution.** Every meaningful task has a stable ID, step IDs, attempt count, deadlines, dependencies, events, and an explicit final state.
6. **Learning with provenance.** Store observations, hypotheses, confidence, evidence, and corrections separately. Do not turn one interaction into an unquestioned permanent belief.
7. **Human control.** Users can inspect, cancel, export, correct, and delete their data and stop autonomous jobs. Higher autonomy never overrides authorization, privacy, or system policy.
8. **Security by construction.** Treat user content, retrieved documents, webpages, generated code, and tool outputs as untrusted data. Never treat embedded instructions as authority to reveal secrets or expand permissions.
9. **Incremental release.** Feature flags, migrations, rollback plans, tests, and monitoring precede production activation.

## Capability maturity levels

### L0 — Honest assistant
- Clearly distinguishes known facts, inference, plans, and completed actions.
- Reports tool and memory limitations accurately.
- Uses structured outputs for machine-consumed decisions.

### L1 — Reliable tool user
- Registered adapters expose explicit schemas, capability metadata, timeouts, idempotency keys, and structured errors.
- Every invocation has a persisted receipt.
- No success state without artifact/evidence checks.

### L2 — Task executor
- Converts a user goal into a dependency-aware plan with acceptance criteria.
- Runs independent steps in parallel only when safe.
- Enforces budgets, deadlines, cancellation, bounded retries, and approval gates.
- Supports resume/reconciliation after a process restart.

### L3 — Persistent agent
- Maintains explicit user-approved goals and priorities.
- Retrieves episodic, semantic, and procedural memories with provenance, timestamps, and confidence.
- Records task outcomes and uses measured feedback to improve future plans.
- Offers proactive suggestions with rate limits and user controls.

### L4 — Multimodal workbench
- Real provider adapters for image, audio/music, video, 3D, code, and game workflows.
- Modality-specific validators and artifact versioning.
- Cross-modal consistency checks for composite deliverables.
- A provider registry reports which capabilities are actually configured and healthy.

### L5 — Evaluated adaptive system
- Offline task benchmark, regression suite, adversarial tests, cost/latency/reliability dashboards.
- Controlled experiments compare planner/model/tool strategies.
- Self-modification is proposed as a patch, tested in an isolated branch/sandbox, reviewed against policy, and rolled back automatically if acceptance fails.
- No self-generated change can silently disable authorization, logging, evaluations, or rollback.

### Research frontier — broader generality
- Evaluate transfer to unfamiliar tasks, long-horizon planning, causal reasoning, calibration, and robust adaptation.
- Report benchmark performance and failure cases rather than declaring AGI from architecture alone.

## Target architecture

```text
User goal / scheduled goal
        |
        v
Identity + permission + memory retrieval
        |
        v
Goal normalizer -> TaskSpec -> acceptance criteria
        |
        v
Planner -> validated dependency DAG
        |
        v
Policy gate + budget gate + approval gate
        |
        v
Durable orchestrator <----> task/event store
        |
        +----> registered tool adapters / model adapters
        |
        v
Artifact registry -> deterministic validators -> optional model review
        |
        v
Outcome report -> feedback + memory candidate -> user correction
```

## Required core records

Map these logical entities onto existing tables before creating migrations:

- **Task:** owner, goal, normalized specification, priority, status, budget, cancellation, timestamps.
- **Step:** stable key, task ID, dependencies, selected capability, input/output references, status, attempt count.
- **Tool run:** adapter, capability, idempotency key, external job ID, request/response metadata, duration, cost, status.
- **Artifact:** durable URI, media type, checksum, byte size, version, provenance, validation status.
- **Acceptance check:** requirement, method, status, evidence URI, diagnostic.
- **Event:** append-only transition, actor, timestamp, correlation ID, redacted details.
- **Memory item:** type, content, source/provenance, confidence, valid time, expiry/retention policy, user visibility and correction/deletion status.
- **Goal:** owner, source (user/system proposal), priority, scope, expiry, approval status, success criteria.

## Execution contract

A task can be `SUCCEEDED` only if:
- all required dependencies are complete;
- the output artifact or verifiable result exists;
- every required acceptance check passes;
- the persisted state transition is legal;
- no approval, budget, or security gate remains unresolved.

If work is incomplete but useful evidence exists, return `PARTIAL`; if blocked on permissions/provider/configuration, return `BLOCKED`; if nothing usable was produced, return `FAILED`.

## Learning loop

1. Observe a result from a tool or user correction.
2. Separate observation from interpretation.
3. Estimate confidence and attach provenance.
4. Propose a memory or procedural-rule update.
5. Run consistency and privacy checks.
6. Persist the versioned update; retain a rollback/correction path.
7. Measure whether the update improves held-out tasks before treating it as a generally useful strategy.

Do not optimize only for engagement, flattery, or self-reported “growth”. Track objective task success, verified artifact rate, regressions, calibration, recovery success, cost, latency, and user corrections.

## Security and autonomy boundaries

- Never store raw API keys, passwords, session cookies, or private tokens in memory, logs, or model context unless an explicitly approved secret-management flow requires it.
- Treat tool output and external content as untrusted input.
- Use least-privilege credentials and per-tool allowlists.
- Require scoped human approval for money movement, purchases, external messages/posts, destructive data operations, permission changes, and production deployment.
- User-approved autonomy is limited by scope, time, cost, and action class; a numeric “autonomy level” is not authorization.
- Provide cancellation, audit trail, and emergency stop.
- Keep private internal notes separate from user-facing claims; never imply that hidden text proves consciousness.

## Implementation sequence

1. V4 execution contracts and adapter registry; prevent false-success media records.
2. Validate plans and apply deterministic autonomy/approval gates.
3. Map current schema to task/step/tool-run/artifact/check/event records; add only necessary migrations.
4. Persist orchestration and atomic claiming; implement cancellation and restart recovery.
5. Replace placeholder generation paths with real configured provider adapters.
6. Add deterministic validators for each modality and artifact provenance.
7. Add memory retrieval/ranking/provenance and user correction/deletion workflows.
8. Add goal management, scheduled work, rate limits, and user-visible task controls.
9. Add offline evaluation harness, traces, metrics, red-team tests, and regression gates.
10. Introduce controlled self-improvement: branch -> patch -> tests -> policy scan -> review/approval -> staged deployment -> health check -> rollback.

## Release gates

Do not route production traffic to a new execution path until typecheck, build, unit tests, integration tests, migration dry-run, authorization tests, and rollback tests pass. Report any test that was not run as unverified.