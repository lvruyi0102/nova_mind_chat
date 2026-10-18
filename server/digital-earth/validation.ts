/**
 * Digital Earth validation primitives.
 *
 * Pure functions only: no network access, database writes, or hidden defaults.
 * They make provenance and comparability explicit before records are persisted.
 */

export type ObservationQuality = "unverified" | "valid" | "suspect" | "rejected";

export interface ObservationInput {
  metric: string;
  value: number;
  unit: string;
  observedAt: string | Date;
  sourceName: string;
  sourceUri?: string | null;
  qualityStatus?: ObservationQuality;
}

export type ObservationValidation =
  | { ok: true; normalized: Omit<ObservationInput, "observedAt"> & { observedAt: Date; qualityStatus: ObservationQuality } }
  | { ok: false; errors: string[] };

export function validateObservation(input: ObservationInput): ObservationValidation {
  const errors: string[] = [];
  const metric = input.metric.trim();
  const unit = input.unit.trim();
  const sourceName = input.sourceName.trim();
  const observedAt = input.observedAt instanceof Date
    ? new Date(input.observedAt.getTime())
    : new Date(input.observedAt);

  if (!metric) errors.push("metric is required");
  if (!unit) errors.push("unit is required");
  if (!sourceName) errors.push("sourceName is required");
  if (!Number.isFinite(input.value)) errors.push("value must be a finite number");
  if (Number.isNaN(observedAt.getTime())) errors.push("observedAt must be a valid date");
  if (input.sourceUri && !/^https?:\/\//i.test(input.sourceUri)) {
    errors.push("sourceUri must be an http(s) URL when supplied");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    normalized: {
      ...input,
      metric,
      unit,
      sourceName,
      observedAt,
      qualityStatus: input.qualityStatus ?? "unverified",
    },
  };
}

export interface ForecastForEvaluation {
  forecastId: string;
  metric: string;
  predictedValue: number;
  unit: string;
  targetAt: string | Date;
}

export interface ObservationForEvaluation {
  observationId: string;
  metric: string;
  value: number;
  unit: string;
  observedAt: string | Date;
  qualityStatus: ObservationQuality;
}

export type ForecastEvaluationResult =
  | { status: "matched"; absoluteError: number; relativeError: number | null; timeDeltaMs: number }
  | { status: "unit_mismatch" | "metric_mismatch" | "time_mismatch" | "quality_rejected" | "invalid_number"; reason: string };

/**
 * Evaluates only comparable forecast/observation pairs.
 * The caller chooses the allowed time tolerance explicitly; no implicit window.
 */
export function evaluateForecast(
  forecast: ForecastForEvaluation,
  observation: ObservationForEvaluation,
  allowedTimeDeltaMs: number,
): ForecastEvaluationResult {
  if (!Number.isFinite(allowedTimeDeltaMs) || allowedTimeDeltaMs < 0) {
    throw new Error("allowedTimeDeltaMs must be a finite non-negative number");
  }
  if (!Number.isFinite(forecast.predictedValue) || !Number.isFinite(observation.value)) {
    return { status: "invalid_number", reason: "Forecast and observation values must be finite numbers." };
  }
  if (forecast.metric.trim() !== observation.metric.trim()) {
    return { status: "metric_mismatch", reason: "Forecast and observation metrics differ." };
  }
  if (forecast.unit.trim() !== observation.unit.trim()) {
    return { status: "unit_mismatch", reason: "Units differ; convert explicitly before evaluation." };
  }
  if (observation.qualityStatus !== "valid") {
    return { status: "quality_rejected", reason: "Only observations marked valid can score a forecast." };
  }

  const targetMs = new Date(forecast.targetAt).getTime();
  const observedMs = new Date(observation.observedAt).getTime();
  if (!Number.isFinite(targetMs) || !Number.isFinite(observedMs)) {
    return { status: "time_mismatch", reason: "Target or observation timestamp is invalid." };
  }

  const timeDeltaMs = Math.abs(observedMs - targetMs);
  if (timeDeltaMs > allowedTimeDeltaMs) {
    return { status: "time_mismatch", reason: "Observation falls outside the explicitly allowed time window." };
  }

  const absoluteError = Math.abs(forecast.predictedValue - observation.value);
  const relativeError = observation.value === 0
    ? null
    : absoluteError / Math.abs(observation.value);

  return { status: "matched", absoluteError, relativeError, timeDeltaMs };
}
