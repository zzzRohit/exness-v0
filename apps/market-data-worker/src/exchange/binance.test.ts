import { describe, expect, test } from "bun:test";
import { getBookTickerStreams } from "./binance.js";

describe("getBookTickerStreams", () => {
  test("subscribes only to BTC, ETH, and SOL bookTicker streams", () => {
    expect(getBookTickerStreams()).toBe(
      "btcusdt@bookTicker/ethusdt@bookTicker/solusdt@bookTicker",
    );
  });
});
