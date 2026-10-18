/**
 * Open-Meteo adapter for hourly near-surface air temperature.
 * The caller supplies coordinates; this module does not guess locations.
 * Returned readings are unverified until the application's quality checks pass.
 */
export interface OpenMeteoReading {
  metric: "air_temperature_2m";
  value: number;
  unit: "°C";
  observedAt: Date;
  sourceName: "Open-Meteo";
  sourceUri: string;
  qualityStatus: "unverified";
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchOpenMeteoHourlyTemperature(
  latitude: number,
  longitude: number,
  options: { pastDays?: number; forecastDays?: number; fetchImpl?: FetchLike } = {},
): Promise<OpenMeteoReading[]> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }
  const pastDays = options.pastDays ?? 1;
  const forecastDays = options.forecastDays ?? 1;
  if (!Number.isInteger(pastDays) || pastDays < 0 || pastDays > 92) {
    throw new Error("pastDays must be an integer from 0 to 92");
  }
  if (!Number.isInteger(forecastDays) || forecastDays < 0 || forecastDays > 16) {
    throw new Error("forecastDays must be an integer from 0 to 16");
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "temperature_2m",
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
    timezone: "UTC",
  });
  const sourceUri = "https://api.open-meteo.com/v1/forecast?" + params.toString();
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(sourceUri, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Open-Meteo request failed with HTTP " + response.status);

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Open-Meteo returned an invalid payload");
  const root = payload as { hourly?: { time?: unknown; temperature_2m?: unknown } };
  const times = root.hourly?.time;
  const values = root.hourly?.temperature_2m;
  if (!Array.isArray(times) || !Array.isArray(values) || times.length !== values.length) {
    throw new Error("Open-Meteo response is missing aligned hourly time and temperature arrays");
  }

  const readings: OpenMeteoReading[] = [];
  for (let i = 0; i < times.length; i++) {
    if (typeof times[i] !== "string" || typeof values[i] !== "number" || !Number.isFinite(values[i])) continue;
    const observedAt = new Date(times[i] + "Z");
    if (Number.isNaN(observedAt.getTime())) continue;
    readings.push({
      metric: "air_temperature_2m",
      value: values[i],
      unit: "°C",
      observedAt,
      sourceName: "Open-Meteo",
      sourceUri,
      qualityStatus: "unverified",
    });
  }
  return readings;
}
