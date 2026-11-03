import type { CandleTimeframe, MarketAsset, MarketCandle } from "../types/market";

const timeframeSeconds: Record<CandleTimeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1_800,
  "1h": 3_600,
  "1d": 86_400,
};

function stableSeed(value: string): number {
  return [...value].reduce(
    (seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16_777_619),
    2_166_136_261,
  ) >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomNormal(random: () => number): number {
  const first = Math.max(random(), Number.EPSILON);
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

export function createMockCandles(
  asset: MarketAsset,
  timeframe: CandleTimeframe,
  count = 140,
): MarketCandle[] {
  const interval = timeframeSeconds[timeframe];
  const now = Math.floor(Date.now() / interval) * interval;
  const random = createRandom(stableSeed(`${asset.symbol}:${timeframe}`));
  const exposure = Math.min(1, count * interval / 86_400);
  const dailyChange = Math.max(-0.2, Math.min(0.2, asset.changePercent / 100));
  const averageReturn = Math.log1p(dailyChange) * exposure / count;
  const baseVolatility = asset.category === "forex"
    ? 0.00016
    : asset.category === "crypto"
      ? 0.00125
      : 0.00055;
  const volatility = baseVolatility * Math.sqrt(interval / 300);
  let volatilityRegime = 1;
  let momentum = 0;
  let previousClose = asset.bid * Math.exp(-averageReturn * count);
  const candles = Array.from({ length: count }, (_, index) => {
    const time = now - (count - index - 1) * interval;
    const open = previousClose;
    volatilityRegime = Math.max(
      0.55,
      Math.min(1.9, volatilityRegime * 0.86 + (0.55 + random() * 1.25) * 0.14),
    );
    momentum = momentum * 0.7 + randomNormal(random) * 0.3;
    const candleReturn = averageReturn +
      volatility * volatilityRegime * (randomNormal(random) * 0.8 + momentum * 0.45);
    const close = open * Math.exp(candleReturn);
    const range = open * volatility * volatilityRegime *
      (0.25 + Math.abs(randomNormal(random)) * 0.45);
    const high = Math.max(open, close) + range * (0.25 + random());
    const low = Math.max(
      Number.EPSILON,
      Math.min(open, close) - range * (0.25 + random()),
    );
    const volumeSpike = random() < 0.045 ? 2.2 + random() * 2.5 : 1;
    const volume = (24 + random() * 76) * volatilityRegime * volumeSpike;

    previousClose = close;
    return { time, open, high, low, close, volume };
  });

  const anchor = asset.bid / (candles.at(-1)?.close ?? asset.bid);
  return candles.map((candle) => ({
    ...candle,
    open: candle.open * anchor,
    high: candle.high * anchor,
    low: candle.low * anchor,
    close: candle.close * anchor,
  }));
}
