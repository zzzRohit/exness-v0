import type { ClosedTrade, OpenPosition } from "../types/market";

const now = Date.now();

export const INITIAL_OPEN_POSITIONS: OpenPosition[] = [
  {
    id: "815204",
    symbol: "BTCUSDT",
    side: "buy",
    volume: 0.1,
    entryPrice: 67_180,
    stopLoss: 66_900,
    takeProfit: 68_200,
    openedAt: now - 36 * 60_000,
  },
  {
    id: "815218",
    symbol: "BTCUSDT",
    side: "sell",
    volume: 0.05,
    entryPrice: 67_520,
    stopLoss: 67_900,
    takeProfit: 66_800,
    openedAt: now - 22 * 60_000,
  },
  {
    id: "815236",
    symbol: "BTCUSDT",
    side: "buy",
    volume: 0.2,
    entryPrice: 67_490,
    stopLoss: 66_950,
    takeProfit: 68_300,
    openedAt: now - 8 * 60_000,
  },
];

export const INITIAL_CLOSED_TRADES: ClosedTrade[] = [
  {
    id: "814983",
    symbol: "ETHUSDT",
    side: "buy",
    volume: 0.35,
    entryPrice: 2_461.1,
    stopLoss: 2_410,
    takeProfit: 2_525,
    openedAt: now - 22 * 60 * 60_000,
    closedAt: now - 19 * 60 * 60_000,
    exitPrice: 2_497.8,
    profitLoss: 12.85,
  },
  {
    id: "814906",
    symbol: "SOLUSDT",
    side: "sell",
    volume: 2,
    entryPrice: 158.45,
    openedAt: now - 29 * 60 * 60_000,
    closedAt: now - 27 * 60 * 60_000,
    exitPrice: 156.9,
    profitLoss: 3.1,
  },
];
