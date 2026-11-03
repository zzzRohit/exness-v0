import { createMockCandles } from "../../mocks/candles.mock";
import { getMockMarketAssets } from "./market.service";
import type { CandleTimeframe, MarketCandle } from "../../types/market";

export function getMockCandles(
  symbol: string,
  timeframe: CandleTimeframe,
): MarketCandle[] {
  const asset = getMockMarketAssets().find((item) => item.symbol === symbol);
  if (!asset) {
    throw new Error(`No mock market data is configured for ${symbol}.`);
  }

  return createMockCandles(asset, timeframe);
}
