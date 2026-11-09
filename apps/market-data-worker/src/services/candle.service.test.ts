import { describe, expect, test } from "bun:test";
import { aggregatePersistedQuotes } from "./candle.service.js";
import type {
  CandleInterval,
  PersistedMarketQuote,
} from "../types/market.types.js";
import { CANDLE_INTERVALS, getCandleStartTimeForInterval } from "../utils/time.js";

function quote(
  asset: PersistedMarketQuote["asset"],
  receivedAt: number,
  updateId: number,
  bidPrice: bigint,
  askPrice: bigint,
  ingestId = BigInt(updateId),
): PersistedMarketQuote {
  return {
    ingestId,
    asset,
    receivedAt,
    updateId,
    bidPrice,
    askPrice,
  };
}

describe("aggregatePersistedQuotes", () => {
  test("aggregates all five configured intervals from the same raw quotes", () => {
    const candles = aggregatePersistedQuotes([
      quote("BTC", Date.UTC(2026, 9, 31, 12, 30), 9, 100n, 101n),
    ]);
    const expectedIntervals: CandleInterval[] = [
      "1m",
      "5m",
      "30m",
      "1d",
      "1w",
    ];

    expect(candles.map(({ interval }) => interval).sort()).toEqual(
      expectedIntervals.sort(),
    );
    expect(candles.every(({ quoteCount }) => quoteCount === 1n)).toBe(true);
  });

  test("initializes bid and ask OHLC independently from the first quote", () => {
    const [candle] = aggregatePersistedQuotes([
      quote("BTC", 1_700_000_000_000, 10, 100n, 103n),
    ], ["1m"]);

    expect(candle).toMatchObject({
      asset: "BTC",
      interval: "1m",
      startTime: 1_699_999_980_000,
      bidOpen: 100n,
      bidHigh: 100n,
      bidLow: 100n,
      bidClose: 100n,
      askOpen: 103n,
      askHigh: 103n,
      askLow: 103n,
      askClose: 103n,
      quoteCount: 1n,
    });
  });

  test("updates highs, lows, closes, and counts using BigInt values", () => {
    const candles = aggregatePersistedQuotes(
      [
        quote("BTC", 1_700_000_000_001, 11, 120n, 125n),
        quote("BTC", 1_700_000_000_002, 12, 90n, 110n),
        quote("BTC", 1_700_000_000_003, 13, 105n, 115n),
      ],
      ["1m"],
    );
    const candle = candles[0]!;

    expect(candle.bidOpen).toBe(120n);
    expect(candle.bidHigh).toBe(120n);
    expect(candle.bidLow).toBe(90n);
    expect(candle.bidClose).toBe(105n);
    expect(candle.askOpen).toBe(125n);
    expect(candle.askHigh).toBe(125n);
    expect(candle.askLow).toBe(110n);
    expect(candle.askClose).toBe(115n);
    expect(candle.quoteCount).toBe(3n);
  });

  test("uses each configured UTC interval and exact interval boundaries", () => {
    const at = Date.UTC(2026, 9, 31, 12, 30, 0);
    expect(
      getCandleStartTimeForInterval(at, "1m"),
    ).toBe(Date.UTC(2026, 9, 31, 12, 30));
    expect(
      getCandleStartTimeForInterval(at, "5m"),
    ).toBe(Date.UTC(2026, 9, 31, 12, 30));
    expect(
      getCandleStartTimeForInterval(at, "30m"),
    ).toBe(Date.UTC(2026, 9, 31, 12, 30));
    expect(
      getCandleStartTimeForInterval(at, "1d"),
    ).toBe(Date.UTC(2026, 9, 31));
    expect(
      getCandleStartTimeForInterval(at, "1w"),
    ).toBe(Date.UTC(2026, 9, 26));

    const boundary = Date.UTC(2026, 9, 31, 12, 35);
    expect(getCandleStartTimeForInterval(boundary, "5m")).toBe(boundary);
    expect(
      getCandleStartTimeForInterval(boundary, "5m") -
        getCandleStartTimeForInterval(boundary - 1, "5m"),
    ).toBe(CANDLE_INTERVALS["5m"]);

    const mondayBoundary = Date.UTC(2026, 9, 26);
    expect(getCandleStartTimeForInterval(mondayBoundary, "1w")).toBe(
      mondayBoundary,
    );
    expect(
      getCandleStartTimeForInterval(mondayBoundary - 1, "1w"),
    ).toBe(mondayBoundary - CANDLE_INTERVALS["1w"]);
    expect(getCandleStartTimeForInterval(Date.UTC(2026, 9, 31), "1d")).toBe(
      Date.UTC(2026, 9, 31),
    );
  });

  test("anchors weekly candles to Monday UTC across year transitions", () => {
    const monday2020 = Date.UTC(2020, 11, 28);
    const monday2021 = Date.UTC(2021, 0, 4);
    const monday2022 = Date.UTC(2021, 11, 27);

    expect(
      getCandleStartTimeForInterval(Date.UTC(2021, 0, 1), "1w"),
    ).toBe(monday2020);
    expect(
      getCandleStartTimeForInterval(
        Date.UTC(2021, 0, 3, 23, 59, 59, 999),
        "1w",
      ),
    ).toBe(monday2020);
    expect(getCandleStartTimeForInterval(monday2021, "1w")).toBe(monday2021);
    expect(
      getCandleStartTimeForInterval(Date.UTC(2022, 0, 1), "1w"),
    ).toBe(monday2022);
  });

  test("creates separate candles for assets and intervals without filling empty intervals", () => {
    const candles = aggregatePersistedQuotes(
      [
        quote("BTC", 1_700_000_000_000, 20, 100n, 101n),
        quote("ETH", 1_700_000_000_000, 20, 200n, 201n),
        quote("BTC", 1_700_000_180_000, 21, 110n, 111n),
      ],
      ["1m"],
    );

    expect(candles).toHaveLength(3);
    expect(
      candles.map(({ asset, startTime, quoteCount }) => [
        asset,
        startTime,
        quoteCount,
      ]),
    ).toEqual([
      ["BTC", 1_699_999_980_000, 1n],
      ["ETH", 1_699_999_980_000, 1n],
      ["BTC", 1_700_000_160_000, 1n],
    ]);
    expect(aggregatePersistedQuotes([], ["1m"])).toEqual([]);
  });

  test("orders out-of-order quotes by received time then update ID", () => {
    const candle = aggregatePersistedQuotes(
      [
        quote("SOL", 1_700_000_000_020, 30, 30n, 31n),
        quote("SOL", 1_700_000_000_010, 20, 20n, 21n),
        quote("SOL", 1_700_000_000_010, 10, 10n, 11n),
      ],
      ["1m"],
    )[0]!;

    expect(candle.bidOpen).toBe(10n);
    expect(candle.askOpen).toBe(11n);
    expect(candle.bidClose).toBe(30n);
    expect(candle.askClose).toBe(31n);
    expect(candle.firstUpdateId).toBe(10);
    expect(candle.lastUpdateId).toBe(30);
  });

  test("incorporates a late quote with a newer ingest ID into its original candle", () => {
    const candle = aggregatePersistedQuotes(
      [
        quote("SOL", 1_700_000_000_020, 20, 20n, 21n, 100n),
        quote("SOL", 1_700_000_000_010, 10, 10n, 11n, 101n),
        quote("SOL", 1_700_000_000_030, 30, 30n, 31n, 102n),
      ],
      ["1m"],
    )[0]!;

    expect(candle.bidOpen).toBe(10n);
    expect(candle.askOpen).toBe(11n);
    expect(candle.bidHigh).toBe(30n);
    expect(candle.askHigh).toBe(31n);
    expect(candle.bidLow).toBe(10n);
    expect(candle.askLow).toBe(11n);
    expect(candle.bidClose).toBe(30n);
    expect(candle.askClose).toBe(31n);
    expect(candle.quoteCount).toBe(3n);
  });

  test("ignores duplicate replayed quote identities in an aggregated batch", () => {
    const replay = quote("ETH", 1_700_000_000_000, 50, 90n, 95n, 1n);
    const candle = aggregatePersistedQuotes([replay, replay], ["1m"])[0]!;

    expect(candle.quoteCount).toBe(1n);
    expect(candle.bidOpen).toBe(90n);
    expect(candle.bidClose).toBe(90n);
  });

  test("reconstructs the same candle after restart from persisted quote rows", () => {
    const persistedQuotes = [
      quote("BTC", 1_700_000_000_000, 60, 100n, 101n),
      quote("BTC", 1_700_000_000_020, 61, 110n, 111n),
    ];

    expect(aggregatePersistedQuotes(persistedQuotes, ["1m"])).toEqual(
      aggregatePersistedQuotes(persistedQuotes, ["1m"]),
    );
  });
});
