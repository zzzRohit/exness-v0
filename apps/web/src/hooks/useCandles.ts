import { useMemo } from "react";
import { getMockCandles } from "../services/market/candle.service";
import type { CandleTimeframe } from "../types/market";

export function useCandles(symbol: string, timeframe: CandleTimeframe) {
  return useMemo(() => getMockCandles(symbol, timeframe), [symbol, timeframe]);
}
