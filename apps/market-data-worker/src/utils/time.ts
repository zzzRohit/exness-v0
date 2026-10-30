
export const CANDLE_INTERVALS = {
  "1m": 60_000,
  "5m": 300_000,
  "30m": 1_800_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
} as const;

export type CandleInterval = keyof typeof CANDLE_INTERVALS;

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
