import { describe, expect, test } from "bun:test";
import {
  buildMarketQuoteInsertStatement,
  insertSerializedMarketQuoteBatch,
} from "./market.quote.writer.js";
import type { LatestBookTicker } from "../types/market.types.js";

function quote(updateId: number): LatestBookTicker {
  return {
    asset: "BTC",
    bidPrice: 100_000_000n,
    askPrice: 101_000_000n,
    bidQuantity: 50_000_000n,
    askQuantity: 30_000_000n,
    updateId,
    receivedAt: 1_700_000_000_000 + updateId,
    exchangeEventTime: null,
  };
}

describe("buildMarketQuoteInsertStatement", () => {
  test("parameterizes all values and preserves BigInt and nullable time values", () => {
    const statement = buildMarketQuoteInsertStatement([quote(1)]);

    expect(statement).not.toBeNull();
    if (!statement) {
      throw new Error("Expected an insert statement.");
    }

    expect(statement.sql).toContain("INSERT INTO public.market_quotes");
    expect(statement.sql).not.toContain("BTC");
    expect(statement.values).toEqual([
      new Date(1_700_000_000_001),
      null,
      "BTC",
      100_000_000n,
      101_000_000n,
      50_000_000n,
      30_000_000n,
      1n,
    ]);
  });

  test("returns no statement for an empty batch", () => {
    expect(buildMarketQuoteInsertStatement([])).toBeNull();
  });
});

describe("insertSerializedMarketQuoteBatch", () => {
  test("acquires the transaction lock before inserting the quote batch", async () => {
    const statement = buildMarketQuoteInsertStatement([quote(1)]);
    if (!statement) {
      throw new Error("Expected an insert statement.");
    }

    const calls: string[] = [];
    await insertSerializedMarketQuoteBatch(
      statement,
      async () => {
        calls.push("lock");
      },
      async (receivedStatement) => {
        calls.push("insert");
        expect(receivedStatement).toBe(statement);
      },
    );

    expect(calls).toEqual(["lock", "insert"]);
  });
});
