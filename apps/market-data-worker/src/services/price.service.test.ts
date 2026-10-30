import { describe, expect, test } from "bun:test";
import {
  calculateSpread,
  getLatestBookTickerPrice,
  updateLatestBookTicker,
} from "./price.service.js";
import { marketQuoteQueue } from "../queue/market.queue.js";
import type {
  LatestBookTicker,
  NormalizedBookTickerInput,
} from "../types/market.types.js";

describe("calculateSpread", () => {
  test("calculates 1% markup and markdown correctly", () => {
    const quote: LatestBookTicker = {
      asset: "BTC",
      bidPrice: 100_000_000n, // $100
      askPrice: 101_000_000n, // $101
      bidQuantity: 50_000_000n,
      askQuantity: 30_000_000n,
      updateId: 100,
      receivedAt: 1_700_000_000_000,
    };

    const result = calculateSpread(quote);

    expect(result.buyPrice).toBe(102_010_000n); // $102.01
    expect(result.sellPrice).toBe(99_000_000n); // $99
  });

  test("handles small prices using BigInt arithmetic", () => {
    const quote: LatestBookTicker = {
      asset: "BTC",
      bidPrice: 100n,
      askPrice: 101n,
      bidQuantity: 50_000_000n,
      askQuantity: 30_000_000n,
      updateId: 101,
      receivedAt: 1_700_000_000_001,
    };

    const result = calculateSpread(quote);

    expect(result.buyPrice).toBe(102n);
    expect(result.sellPrice).toBe(99n);
  });

  test("truncates fractional scaled units during division", () => {
    const quote: LatestBookTicker = {
      asset: "BTC",
      bidPrice: 101n,
      askPrice: 101n,
      bidQuantity: 50_000_000n,
      askQuantity: 30_000_000n,
      updateId: 102,
      receivedAt: 1_700_000_000_002,
    };

    const result = calculateSpread(quote);

    expect(result.buyPrice).toBe(102n);
    expect(result.sellPrice).toBe(99n);
  });
});

describe("updateLatestBookTicker", () => {
  test("preserves receivedAt in stored and queued quotes", () => {
    const receivedAt = 1_700_000_000_123;
    const quote: NormalizedBookTickerInput = {
      asset: "BTC",
      symbol: "BTCUSDT",
      bidPrice: "100",
      bidQuantity: "0.5",
      askPrice: "101",
      askQuantity: "0.3",
      updateId: 1_700_000_000_123,
      receivedAt,
    };

    const latestQuote = updateLatestBookTicker(quote);

    expect(latestQuote).not.toBeNull();
    if (!latestQuote) {
      throw new Error("Expected a valid latest book ticker");
    }

    expect(latestQuote.receivedAt).toBe(receivedAt);
    expect(getLatestBookTickerPrice("BTC")).toBe(latestQuote);

    const queueSizeBefore = marketQuoteQueue.size;
    expect(marketQuoteQueue.enqueue(latestQuote)).toBe(true);
    const queuedQuotes = marketQuoteQueue.dequeueBatch(queueSizeBefore + 1);

    expect(queuedQuotes[queuedQuotes.length - 1]).toBe(latestQuote);
    expect(queuedQuotes[queuedQuotes.length - 1]?.receivedAt).toBe(receivedAt);
  });
});
