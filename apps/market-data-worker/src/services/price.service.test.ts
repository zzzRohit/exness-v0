import { describe, expect, test } from "bun:test";
import {
  calculateSpread,
  getLatestBookTickerPrice,
  updateLatestBookTicker,
} from "./price.service.js";
import { MarketQuoteQueue } from "../queue/market.queue.js";
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
      exchangeEventTime: null,
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
      exchangeEventTime: null,
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
      exchangeEventTime: null,
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
      exchangeEventTime: null,
    };

    const latestQuote = updateLatestBookTicker(quote);

    expect(latestQuote).not.toBeNull();
    if (!latestQuote) {
      throw new Error("Expected a valid latest book ticker");
    }

    expect(latestQuote.receivedAt).toBe(receivedAt);
    expect(getLatestBookTickerPrice("BTC")).toBe(latestQuote);

    const queue = new MarketQuoteQueue();
    expect(queue.enqueue(latestQuote)).toBe(true);
    const queuedQuotes = queue.peekBatch(1);

    expect(queuedQuotes[queuedQuotes.length - 1]).toBe(latestQuote);
    expect(queuedQuotes[queuedQuotes.length - 1]?.receivedAt).toBe(receivedAt);
    expect(queuedQuotes[queuedQuotes.length - 1]?.exchangeEventTime).toBeNull();
    queue.acknowledgeBatch(1);
  });

  test("rejects duplicate or stale update IDs", () => {
    const first = updateLatestBookTicker({
      asset: "ETH",
      symbol: "ETHUSDT",
      bidPrice: "100",
      bidQuantity: "0.5",
      askPrice: "101",
      askQuantity: "0.3",
      updateId: 50,
      receivedAt: 1_700_000_000_000,
      exchangeEventTime: null,
    });

    expect(first).not.toBeNull();
    expect(
      updateLatestBookTicker({
        asset: "ETH",
        symbol: "ETHUSDT",
        bidPrice: "100",
        bidQuantity: "0.5",
        askPrice: "101",
        askQuantity: "0.3",
        updateId: 50,
        receivedAt: 1_700_000_000_001,
        exchangeEventTime: null,
      }),
    ).toBeNull();
  });

  test("normalizes Binance eight-place bookTicker strings without changing stored scales", () => {
    const samples = [
      {
        asset: "BTC" as const,
        symbol: "BTCUSDT" as const,
        bidPrice: "77380.00000000",
        askPrice: "77380.01000000",
        bidQuantity: "0.48204000",
        askQuantity: "4.99491000",
        expectedBid: 77_380_000_000n,
        expectedAsk: 77_380_010_000n,
        expectedBidQuantity: 48_204_000n,
        expectedAskQuantity: 499_491_000n,
      },
      {
        asset: "ETH" as const,
        symbol: "ETHUSDT" as const,
        bidPrice: "2242.16000000",
        askPrice: "2242.17000000",
        bidQuantity: "21.36680000",
        askQuantity: "51.84400000",
        expectedBid: 2_242_160_000n,
        expectedAsk: 2_242_170_000n,
        expectedBidQuantity: 2_136_680_000n,
        expectedAskQuantity: 5_184_400_000n,
      },
      {
        asset: "SOL" as const,
        symbol: "SOLUSDT" as const,
        bidPrice: "95.42000000",
        askPrice: "95.43000000",
        bidQuantity: "330.99900000",
        askQuantity: "114.86200000",
        expectedBid: 95_420_000n,
        expectedAsk: 95_430_000n,
        expectedBidQuantity: 33_099_900_000n,
        expectedAskQuantity: 11_486_200_000n,
      },
    ];

    for (const sample of samples) {
      const normalized = updateLatestBookTicker({
        ...sample,
        updateId: 1_700_000_100_000,
        receivedAt: 1_700_000_000_000,
        exchangeEventTime: null,
      });

      expect(normalized).not.toBeNull();
      expect(normalized?.bidPrice).toBe(sample.expectedBid);
      expect(normalized?.askPrice).toBe(sample.expectedAsk);
      expect(normalized?.bidQuantity).toBe(sample.expectedBidQuantity);
      expect(normalized?.askQuantity).toBe(sample.expectedAskQuantity);
    }
  });

  test("reports asset, field, and raw value when meaningful price precision is excessive", () => {
    expect(() =>
      updateLatestBookTicker({
        asset: "SOL",
        symbol: "SOLUSDT",
        bidPrice: "95.42000001",
        askPrice: "95.43000000",
        bidQuantity: "1.00000000",
        askQuantity: "1.00000000",
        updateId: 1_700_000_100_001,
        receivedAt: 1_700_000_000_000,
        exchangeEventTime: null,
      }),
    ).toThrow('Too many decimal places for SOL bidPrice: "95.42000001"');
  });
});
