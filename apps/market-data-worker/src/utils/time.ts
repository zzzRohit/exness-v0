
import type { CandleInterval } from "../types/market.types.js";

export const CANDLE_INTERVALS = {
  "1m": 60_000,
  "5m": 300_000,
  "30m": 1_800_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
} as const;

export type { CandleInterval } from "../types/market.types.js";

export const getCandleStartTime = (
  timestamp: number,
  intervalMs: number
): number => {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("Invalid timestamp");
  }

  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) {
    throw new Error("Invalid interval");
  }

  return Math.floor(timestamp / intervalMs) * intervalMs;
};

export const getCandleStartTimeForInterval = (
  timestamp: number,
  interval: CandleInterval,
): number => {
  const intervalMs = CANDLE_INTERVALS[interval];
  if (interval === "1w") {
    // Weekly candles use ISO-style Monday 00:00 UTC boundaries.
    const mondayOffsetMs = 3 * CANDLE_INTERVALS["1d"];
    return (
      getCandleStartTime(timestamp + mondayOffsetMs, intervalMs) -
      mondayOffsetMs
    );
  }

  return getCandleStartTime(timestamp, intervalMs);
};
