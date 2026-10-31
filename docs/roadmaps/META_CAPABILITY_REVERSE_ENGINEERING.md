# META Capability Reverse-Engineering Plan — NOVA Edition

Status: Phase 0 architecture baseline  
Branch: `feat/meta-capability-foundation`  
Repository baseline inspected: `main` at `fb05040eb3804bd00e1124a76170ed0b19e32636`  
Last observed repository commit: 2026-10-18

## 1. Mission

Build an independently operable capability stack inspired by publicly observable Meta products and openly published Meta research. This is not a clone of Meta's private source code, private model weights, ranking parameters, internal datasets, or user data.

The implementation rule is:

> Research → specify → implement → test → measure → integrate.

A feature is not "implemented" merely because a screen exists or an API key is configured. Every capability must have an execution path, explicit dependencies, tests, and a status label.

## 2. Repository baseline

The current repository is a TypeScript application with:
- React/Vite client.
- Express + tRPC server.
- Drizzle ORM and MySQL/TiDB-oriented database setup.
- Existing cognitive, reasoning, learning, autonomy, creative-studio, digital-earth, storage, and background-task areas.
- Existing test and build scripts in `package.json`.

The README describes several advanced capabilities, but those descriptions are not treated as proof that each subsystem is production-operational. Each relevant code path must be audited before reuse.

Existing foundation to preserve:
- Authentication and user ownership boundaries.
- Existing cognition, memory, learning, and metacognition modules.
- Existing creative studio and digital-earth work.
- Existing database conventions and deployment pipeline.

Do not replace or duplicate existing modules without a code-level reason.

## 3. Capability map

| Domain | Meta reference surface | NOVA target | Initial implementation stance |
|---|---|---|---|
| Foundation models | Llama family; current Meta model catalog | Provider-neutral model gateway, model registry, evaluation | Integrate only models whose current license and hosting requirements are verified |
| Multimodal perception | Llama vision; SAM/SAM 2 research | Image/video understanding, object masks, tracking, scene metadata | SAM 2 is a strong first open-model candidate |
| Media creation | Movie Gen research | Brief-to-storyboard, asset planning, generation-provider adapters, editing pipeline | Movie Gen is research reference, not assumed to be downloadable or callable |
| Social publishing | Facebook, Instagram, Threads, WhatsApp surfaces | Platform connector interfaces, content calendar, publishing status, analytics ingestion | Official APIs and permissions required for platform actions |
| Ads and commerce | Meta Ads / Marketing APIs and measurement surfaces | Campaign workspace, creative variants, conversion event ledger, ROI reporting | Never automate ad spend without explicit approval |
| Recommendation | Feed/Reels ranking research and engineering | Candidate generation, ranking, feedback loop, offline evaluation | Build a small transparent recommender first; do not claim to reproduce Meta's ranking |
| Messaging and agents | Messenger, WhatsApp Business | Inbox adapters, approved templates, agent handoff, audit trail | Official API, opt-in, and platform policy constraints apply |
| Spatial/embodied | Quest, smart glasses, spatial research | Device capability adapters and perception interfaces | Defer until a real device/SDK is selected |

## 4. Technical principles

### 4.1 Provider-neutral adapters

No business logic should depend directly on one model or platform vendor. Use interfaces such as:
- `ModelProvider`
- `VisionProvider`
- `MediaGenerationProvider`
- `SocialPlatformConnector`
- `AdsPlatformConnector`
- `MessagingConnector`

Each adapter declares supported operations, authentication mode, cost model, rate limits, data retention behavior, and required permissions.

### 4.2 Evidence and provenance

Every imported or generated artifact records:
- source/provider and model/version;
- creation time and task ID;
- input asset references and user authorization;
- license/usage status where known;
- processing steps;
- quality/evaluation results.

Unknown rights or provenance must remain `unknown`, not silently become `approved`.

### 4.3 Human approval gates

Require explicit approval for:
- publishing externally;
- sending messages to real people;
- creating or changing paid campaigns;
- spending money or changing budgets;
- deleting source assets or user data.

Read-only research, drafts, local transforms, and dry-run plans can proceed without external side effects.

### 4.4 Honest capability states

Use these states consistently:
- `researching`
- `specified`
- `implemented`
- `tested`
- `connected`
- `production_verified`
- `blocked_external_permission`
- `blocked_cost_or_hardware`

A configured key does not equal a verified integration. A mocked response does not equal a live capability.

## 5. Proposed architecture

```text
User / Nova UI
     |
     v
Capability Router (tRPC)
     |
     +--> Task Orchestrator ----> Approval / Policy Gate
     |             |
     |             +--> Model Gateway
     |             +--> Vision & Media Pipeline
     |             +--> Social Connectors
     |             +--> Ads & Measurement Connectors
     |             +--> Messaging Connectors
     |
     +--> Capability Registry
     +--> Evaluation & Telemetry
     |
     v
Existing DB + Object Storage + Memory / Learning Systems
```

Proposed new server area (add incrementally, not as a large rewrite):

```text
server/metaReverse/
  registry/
  providers/
  tasks/
  policies/
  evaluation/
  schemas/
```

The name `metaReverse` denotes the research program, not an affiliation with Meta.

## 6. First build sequence

### Phase 1 — Capability registry and audit foundation

1. Add a typed capability registry.
2. Record each capability's status, dependencies, permissions, cost class, and verification evidence.
3. Add dry-run task records and an approval gate for external side effects.
4. Add tests for registry validation, state transitions, and approval enforcement.
5. Expose a read-only capability inventory in the existing UI only after server-side contracts are stable.

Acceptance criteria:
- Every capability has a stable ID and status.
- Missing credentials are reported as blocked, not as success.
- External actions cannot execute without an approval record.
- Tests prove denied actions remain unexecuted.

### Phase 2 — Visual intelligence pilot

Use SAM 2 as the first concrete Meta-research-derived capability:
- image object segmentation;
- video object segmentation/tracking;
- mask and tracking metadata;
- export masks as inputs to downstream editing.

Acceptance criteria:
- A sample image can be segmented and the mask artifact saved.
- A sample video can track a prompted object across frames.
- Runtime, hardware requirements, and license are documented.
- A failed or unavailable model runtime produces a clear blocked status.

### Phase 3 — Media production workflow

Build a vendor-neutral pipeline:
Brief → shot plan → asset checklist → generated/source assets → edit decision list → render → quality checks → human approval → export.

Preserve user-owned music and source assets; record their rights separately from model-generated assets.

### Phase 4 — Recommendation and commercial intelligence

Start with explainable, measurable baselines:
- event schema and consent-aware event collection;
- content/product features;
- candidate generation;
- transparent ranking baseline;
- offline precision/recall or NDCG evaluation;
- A/B test ledger;
- revenue and cost attribution.

Do not pretend a small baseline is equivalent to Meta-scale ranking.

### Phase 5 — Official social and ads connectors

Implement one platform at a time using its documented APIs:
- OAuth and least-privilege scopes;
- token refresh and revocation handling;
- rate-limit/backoff;
- idempotent publishing;
- webhook verification;
- read-only mode by default;
- explicit confirmation before publishing or spending.

## 7. First technical research findings

### SAM 2

Meta publicly released SAM 2 for promptable segmentation of objects in images and videos. Its streaming memory design supports object continuity across frames. The official repository states that model checkpoints, demo code, and training code use Apache 2.0.

Sources:
- https://ai.meta.com/research/sam2/
- https://github.com/facebookresearch/sam2
- https://about.fb.com/news/2024/07/our-new-ai-model-can-segment-video/

Decision: select SAM 2 for the first visual-intelligence pilot, subject to a hardware/runtime test.

### Llama

Meta's developer portal lists Llama model families and documentation for access, hosting, deployment, vision capabilities, and licensing.

Sources:
- https://dev.meta.ai/llama
- https://dev.meta.ai/llama/docs/how-to-guides/vision-capabilities

Decision: evaluate Llama as one optional provider, not as the hard-coded core. Verify the exact model card, license, acceptable-use policy, hardware footprint, and inference cost before selection.

### Movie Gen

Meta's Movie Gen research describes text-to-video, instruction-based video editing, personalization, and audio generation. Research publication does not establish that public weights or a generally available API can be used by this project.

Sources:
- https://ai.meta.com/research/movie-gen/
- https://ai.meta.com/research/publications/movie-gen-a-cast-of-media-foundation-models

Decision: use Movie Gen as a capability benchmark and workflow reference only. Do not plan a direct integration until a supported public access route is verified.

### Recommendation systems

Meta Engineering has published material on Instagram recommendation infrastructure and large-scale ads ranking. These are architectural learning sources, not a complete disclosure of proprietary ranking code or parameters.

Sources:
- https://engineering.fb.com/2025/05/21/production-engineering/journey-to-1000-models-scaling-instagrams-recommendation-system/
- https://engineering.fb.com/2026/10/12/ml-applications/turning-opportunistic-ai-inference-capacity-into-better-ads-recommendations/

Decision: build a transparent small-scale recommender and evaluate it against explicit metrics. Do not claim to reproduce Meta's production system.

## 8. Out of scope / prohibited shortcuts

- No scraping private accounts, bypassing access controls, or collecting data without authorization.
- No copying proprietary source code, private weights, or confidential datasets.
- No fabricated API integrations or placeholder success responses.
- No automated paid spend without explicit user approval.
- No self-modifying production code without review, tests, rollback, and audit logs.
- No broad rewrite of existing Nova-Mind systems before a code audit demonstrates the need.

## 9. Immediate next engineering task

Implement Phase 1 only:
- inspect existing schema and router conventions;
- add capability registry types and validation;
- add persistence only after confirming the existing database schema conventions;
- add tests before UI;
- commit on `feat/meta-capability-foundation`.

This document is a design baseline, not a claim that Phase 1 code has already been implemented.
