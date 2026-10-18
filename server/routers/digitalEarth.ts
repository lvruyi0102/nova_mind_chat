import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { forecastEvaluations, worldEntities, worldForecasts, worldObservations } from "../../drizzle/schema";
import { fetchOpenMeteoHourlyTemperature } from "../digital-earth/sources/openMeteo";
import { evaluateForecast } from "../digital-earth/validation";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Database is not configured or unavailable; no data was persisted.",
    });
  }
  return db;
}

export const digitalEarthRouter = router({
  status: protectedProcedure.query(async () => ({
    service: "digital-earth",
    adapter: "open-meteo-hourly-temperature",
    persistenceConfigured: Boolean(process.env.DATABASE_URL),
    caveat: "External readings remain unverified until a separate quality-control process approves them.",
  })),

  syncTemperature: protectedProcedure
    .input(z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      label: z.string().trim().min(1).max(255).optional(),
      pastDays: z.number().int().min(0).max(92).default(1),
      forecastDays: z.number().int().min(0).max(16).default(1),
      maxReadings: z.number().int().min(1).max(500).default(72),
    }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const readings = await fetchOpenMeteoHourlyTemperature(input.latitude, input.longitude, {
        pastDays: input.pastDays,
        forecastDays: input.forecastDays,
      });
      const selected = readings.slice(-input.maxReadings);
      const entityId = `weather-${input.latitude.toFixed(4)}-${input.longitude.toFixed(4)}`;
      const label = input.label ?? `Weather grid ${input.latitude.toFixed(3)}, ${input.longitude.toFixed(3)}`;

      const saved = await db.transaction(async (tx) => {
        const existingEntity = await tx.select({ entityId: worldEntities.entityId })
          .from(worldEntities).where(eq(worldEntities.entityId, entityId)).limit(1);
        if (existingEntity.length === 0) {
          await tx.insert(worldEntities).values({
            entityId,
            entityType: "weather_grid",
            name: label,
            description: "Coordinate-based hourly weather series from Open-Meteo.",
            latitude: String(input.latitude),
            longitude: String(input.longitude),
            propertiesJson: JSON.stringify({ provider: "Open-Meteo", metric: "air_temperature_2m" }),
            sourceUri: "https://open-meteo.com/",
          });
        }

        let count = 0;
        let skippedDuplicates = 0;
        for (const reading of selected) {
          const existing = await tx.select({ observationId: worldObservations.observationId })
            .from(worldObservations)
            .where(and(
              eq(worldObservations.entityId, entityId),
              eq(worldObservations.metric, reading.metric),
              eq(worldObservations.observedAt, reading.observedAt),
              eq(worldObservations.sourceName, reading.sourceName),
            ))
            .limit(1);
          if (existing.length > 0) {
            skippedDuplicates++;
            continue;
          }
          await tx.insert(worldObservations).values({
            observationId: randomUUID(),
            entityId,
            metric: reading.metric,
            value: String(reading.value),
            unit: reading.unit,
            observedAt: reading.observedAt,
            sourceName: reading.sourceName,
            sourceUri: reading.sourceUri,
            qualityStatus: "unverified",
            qualityNotes: "Imported from public API; not yet independently validated.",
            rawPayload: JSON.stringify({ value: reading.value, observedAt: reading.observedAt.toISOString() }),
          });
          count++;
        }
        return { count, skippedDuplicates };
      });

      return {
        success: true,
        entityId,
        label,
        received: readings.length,
        persisted: saved.count,
        skippedDuplicates: saved.skippedDuplicates,
        qualityStatus: "unverified" as const,
        source: "Open-Meteo",
        latestObservedAt: selected.at(-1)?.observedAt.toISOString() ?? null,
      };
    }),

  latestObservations: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
      metric: z.string().trim().min(1).max(160).optional(),
    }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      const query = db.select().from(worldObservations);
      if (input.metric) {
        return query.where(eq(worldObservations.metric, input.metric))
          .orderBy(desc(worldObservations.observedAt))
          .limit(input.limit);
      }
      return query.orderBy(desc(worldObservations.observedAt)).limit(input.limit);
    }),

  listEntities: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      return db.select().from(worldEntities).orderBy(desc(worldEntities.createdAt)).limit(input.limit);
    }),

  reviewObservation: adminProcedure
    .input(z.object({
      observationId: z.string().uuid(),
      qualityStatus: z.enum(["valid", "suspect", "rejected"]),
      qualityNotes: z.string().trim().min(3).max(2000),
    }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const existing = await db.select({ observationId: worldObservations.observationId })
        .from(worldObservations)
        .where(eq(worldObservations.observationId, input.observationId))
        .limit(1);
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Observation was not found." });
      }

      await db.update(worldObservations).set({
        qualityStatus: input.qualityStatus,
        qualityNotes: input.qualityNotes,
      }).where(eq(worldObservations.observationId, input.observationId));

      return {
        observationId: input.observationId,
        qualityStatus: input.qualityStatus,
        reviewed: true as const,
      };
    }),

  createForecast: protectedProcedure
    .input(z.object({
      entityId: z.string().min(1).max(36),
      metric: z.string().trim().min(1).max(160),
      predictedValue: z.number().finite(),
      unit: z.string().trim().min(1).max(48),
      targetAt: z.coerce.date(),
      modelVersion: z.string().trim().min(1).max(80),
      assumptions: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const entity = await db.select({ entityId: worldEntities.entityId })
        .from(worldEntities).where(eq(worldEntities.entityId, input.entityId)).limit(1);
      if (!entity.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "World entity was not found." });
      }
      if (input.targetAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Forecast target time must be in the future." });
      }
      const forecastId = randomUUID();
      await db.insert(worldForecasts).values({
        forecastId,
        entityId: input.entityId,
        metric: input.metric,
        predictedValue: String(input.predictedValue),
        unit: input.unit,
        targetAt: input.targetAt,
        modelVersion: input.modelVersion,
        assumptionsJson: JSON.stringify(input.assumptions),
        status: "open",
      });
      return { forecastId, status: "open" as const };
    }),

  listForecasts: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      return db.select().from(worldForecasts).orderBy(desc(worldForecasts.issuedAt)).limit(input.limit);
    }),

  evaluateForecast: protectedProcedure
    .input(z.object({
      forecastId: z.string().uuid(),
      observationId: z.string().uuid(),
      allowedTimeDeltaMs: z.number().int().min(0).max(7 * 24 * 60 * 60 * 1000).default(60 * 60 * 1000),
    }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const [forecastRows] = await Promise.all([
        db.select().from(worldForecasts).where(eq(worldForecasts.forecastId, input.forecastId)).limit(1),
      ]);
      const observationRows = await db.select().from(worldObservations)
        .where(eq(worldObservations.observationId, input.observationId)).limit(1);
      const forecast = forecastRows[0];
      const observation = observationRows[0];
      if (!forecast || !observation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Forecast or observation was not found." });
      }
      if (forecast.entityId !== observation.entityId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Forecast and observation must belong to the same world entity." });
      }
      if (forecast.status !== "open") {
        throw new TRPCError({ code: "CONFLICT", message: "Only open forecasts can be evaluated." });
      }

      const result = evaluateForecast({
        forecastId: forecast.forecastId,
        metric: forecast.metric,
        predictedValue: Number(forecast.predictedValue),
        unit: forecast.unit,
        targetAt: forecast.targetAt,
      }, {
        observationId: observation.observationId,
        metric: observation.metric,
        value: Number(observation.value),
        unit: observation.unit,
        observedAt: observation.observedAt,
        qualityStatus: observation.qualityStatus,
      }, input.allowedTimeDeltaMs);

      const status = result.status === "matched"
        ? "matched"
        : result.status === "unit_mismatch"
          ? "unit_mismatch"
          : result.status === "time_mismatch"
            ? "time_mismatch"
            : result.status === "quality_rejected"
              ? "quality_rejected"
              : "manual_review";
      const evaluationId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(forecastEvaluations).values({
          evaluationId,
          forecastId: forecast.forecastId,
          observationId: observation.observationId,
          absoluteError: result.status === "matched" ? String(result.absoluteError) : null,
          relativeError: result.status === "matched" && result.relativeError !== null ? String(result.relativeError) : null,
          evaluationStatus: status,
          notes: result.status === "matched"
            ? `Time delta: ${result.timeDeltaMs} ms`
            : result.reason,
        });

        if (result.status === "matched") {
          await tx.update(worldForecasts).set({ status: "evaluated" })
            .where(eq(worldForecasts.forecastId, forecast.forecastId));
        }
      });
      return { evaluationId, ...result, persistedStatus: status };
    }),
});
