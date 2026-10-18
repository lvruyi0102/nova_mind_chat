# Digital Earth server foundation

This folder contains the first server-side building blocks.

- `validation.ts`: validates observation provenance and compares forecasts with observations only when metric, unit, quality, and time window match.
- `validation.test.ts`: tests those evaluation boundaries.
- `sources/openMeteo.ts`: fetches hourly 2 m air temperature from the public Open-Meteo API for caller-supplied coordinates.
- `sources/openMeteo.test.ts`: tests mapping, coordinate validation, and HTTP errors.
- `../routers/digitalEarth.ts`: authenticated tRPC endpoints for service status, weather sync, observation/entity/forecast listing, forecast creation, and persisted forecast evaluation; administrator-only observation quality review is required before imported readings can score forecasts.
- `client/src/pages/DigitalEarthPage.tsx`: `/digital-earth` dashboard for syncing and inspecting weather observations.
- `../../drizzle/0026_digital_earth.sql`: migration for entities, observations, hypotheses, scenarios, forecasts, evaluations, and evolution proposals; registered in the Drizzle journal with a matching schema snapshot.
- `.github/workflows/digital-earth-ci.yml`: runs TypeScript checks, unit tests, and production build on pushes and pull requests.

Readings from an external API are marked `unverified`. Ingestion is not quality approval. Weather sync persists readings only after the migration has been applied to the target database.

From the repository root, verify with:

```bash
pnpm vitest run server/digital-earth
pnpm check
```

The migration has been committed but has not been executed against a database in this work session. Apply it only after reviewing the SQL, confirming the target database, and taking a backup; do not run production migrations without a rollback plan. The dashboard disables weather sync when `DATABASE_URL` is absent. Forecast scoring accepts only observations already marked `valid`; imported weather readings remain `unverified`. CI is configured, but a successful run must be observed before calling the change verified.
