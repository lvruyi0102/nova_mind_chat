import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { worldEntities, worldObservations } from "../../drizzle/schema";
import { fetchOpenMeteoHourlyTemperature } from "../digital-earth/sources/openMeteo";

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
      const entityId = randomUUID();
      const label = input.label ?? `Weather grid ${input.latitude.toFixed(3)}, ${input.longitude.toFixed(3)}`;

      await db.insert(worldEntities).values({
        entityId,
        entityType: "weather_grid",
        name: label,
        description: "Coordinate-based hourly weather series from Open-Meteo.",
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        propertiesJson: JSON.stringify({ provider: "Open-Meteo", metric: "air_temperature_2m" }),
        sourceUri: "https://open-meteo.com/",
      });

      let saved = 0;
      for (const reading of selected) {
        await db.insert(worldObservations).values({
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
        saved++;
      }

      return {
        success: true,
        entityId,
        label,
        received: readings.length,
        persisted: saved,
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
      const rows = await db.select().from(worldObservations).orderBy(desc(worldObservations.observedAt)).limit(input.limit);
      return input.metric ? rows.filter(row => row.metric === input.metric) : rows;
    }),

  listEntities: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      return db.select().from(worldEntities).orderBy(desc(worldEntities.createdAt)).limit(input.limit);
    }),
});
