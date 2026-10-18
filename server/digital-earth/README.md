# Digital Earth server foundation

This folder contains the first server-side building blocks.

- `validation.ts`: validates observation provenance and compares forecasts with observations only when metric, unit, quality, and time window match.
- `validation.test.ts`: tests those evaluation boundaries.
- `sources/openMeteo.ts`: fetches hourly 2 m air temperature from the public Open-Meteo API for caller-supplied coordinates.
- `sources/openMeteo.test.ts`: tests mapping, coordinate validation, and HTTP errors.

Readings from an external API are marked `unverified`. Ingestion is not quality approval. This adapter does not persist data in the database yet.

From the repository root, verify with:

```bash
pnpm vitest run server/digital-earth
pnpm check
```

Database schema changes still need a reviewed migration. Do not run production migrations without a backup and rollback plan.
