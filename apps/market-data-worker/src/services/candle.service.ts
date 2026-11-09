import type {
  BidAskCandle,
  CandleInterval,
  PersistedMarketQuote,
} from "../types/market.types.js";
import {
  CANDLE_INTERVALS,
  getCandleStartTimeForInterval,
} from "../utils/time.js";

export function aggregatePersistedQuotes(
  quotes: readonly PersistedMarketQuote[],
  intervals: readonly CandleInterval[] = Object.keys(
    CANDLE_INTERVALS,
  ) as CandleInterval[],
): BidAskCandle[] {
  const candles = new Map<string, BidAskCandle>();
  const seenQuotes = new Set<string>();

  for (const quote of quotes) {
    const identity = `${quote.asset}:${quote.receivedAt}:${quote.updateId}`;
    if (seenQuotes.has(identity)) {
      continue;
    }
    seenQuotes.add(identity);

    for (const interval of intervals) {
      const startTime = getCandleStartTimeForInterval(
        quote.receivedAt,
        interval,
      );
      const key = `${quote.asset}:${interval}:${startTime}`;
      const candle = candles.get(key);

      if (!candle) {
        candles.set(key, {
          asset: quote.asset,
          interval,
          startTime,
          bidOpen: quote.bidPrice,
          bidHigh: quote.bidPrice,
          bidLow: quote.bidPrice,
          bidClose: quote.bidPrice,
          askOpen: quote.askPrice,
          askHigh: quote.askPrice,
          askLow: quote.askPrice,
          askClose: quote.askPrice,
          quoteCount: 1n,
          firstReceivedAt: quote.receivedAt,
          firstUpdateId: quote.updateId,
          lastReceivedAt: quote.receivedAt,
          lastUpdateId: quote.updateId,
        });
        continue;
      }

      candle.quoteCount += 1n;
      if (
        compareQuoteOrder(
          quote.receivedAt,
          quote.updateId,
          candle.firstReceivedAt,
          candle.firstUpdateId,
        ) < 0
      ) {
        candle.bidOpen = quote.bidPrice;
        candle.askOpen = quote.askPrice;
        candle.firstReceivedAt = quote.receivedAt;
        candle.firstUpdateId = quote.updateId;
      }

      if (
        compareQuoteOrder(
          quote.receivedAt,
          quote.updateId,
          candle.lastReceivedAt,
          candle.lastUpdateId,
        ) > 0
      ) {
        candle.bidClose = quote.bidPrice;
        candle.askClose = quote.askPrice;
        candle.lastReceivedAt = quote.receivedAt;
        candle.lastUpdateId = quote.updateId;
      }

      candle.bidHigh = maxBigInt(candle.bidHigh, quote.bidPrice);
      candle.bidLow = minBigInt(candle.bidLow, quote.bidPrice);
      candle.askHigh = maxBigInt(candle.askHigh, quote.askPrice);
      candle.askLow = minBigInt(candle.askLow, quote.askPrice);
    }
  }

  return [...candles.values()].sort(
    (left, right) =>
      left.startTime - right.startTime ||
      left.asset.localeCompare(right.asset) ||
      left.interval.localeCompare(right.interval),
  );
}

function compareQuoteOrder(
  receivedAt: number,
  updateId: number,
  otherReceivedAt: number,
  otherUpdateId: number,
): number {
  return receivedAt - otherReceivedAt || updateId - otherUpdateId;
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}

function minBigInt(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}