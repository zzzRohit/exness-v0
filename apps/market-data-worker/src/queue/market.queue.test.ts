import { describe, expect, test } from "bun:test";
import { MarketQuoteQueue } from "./market.queue.js";
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

describe("MarketQuoteQueue", () => {
  test("peeks without removing and acknowledges a successful batch", () => {
    const queue = new MarketQuoteQueue();
    const first = quote(1);
    const second = quote(2);
    queue.enqueue(first);
    queue.enqueue(second);

    expect(queue.peekBatch(1)).toEqual([first]);
    expect(queue.size).toBe(2);

    queue.acknowledgeBatch(1);
    expect(queue.peekBatch(2)).toEqual([second]);
    expect(queue.size).toBe(1);
  });

  test("preserves order when new records arrive while a batch is in flight", () => {
    const queue = new MarketQuoteQueue();
    const first = quote(1);
    const second = quote(2);
    const third = quote(3);
    queue.enqueue(first);
    queue.enqueue(second);

    const batch = queue.peekBatch(2);
    queue.enqueue(third);
    queue.acknowledgeBatch(batch.length);

    expect(queue.peekBatch(3)).toEqual([third]);
  });

  test("allows only one claimed batch at a time", () => {
    const queue = new MarketQuoteQueue();
    const first = quote(1);
    const second = quote(2);
    queue.enqueue(first);
    queue.enqueue(second);

    const claim = queue.claimBatch(1);
    expect(claim?.quotes).toEqual([first]);
    expect(queue.claimBatch(1)).toBeNull();
    expect(() => queue.acknowledgeBatch(1)).toThrow();

    queue.enqueue(quote(3));
    if (!claim) {
      throw new Error("Expected a claimed batch.");
    }
    queue.acknowledgeClaim(claim.id);
    expect(queue.peekBatch(3)).toEqual([second, quote(3)]);
  });

  test("handles empty queues and batches larger than available", () => {
    const queue = new MarketQuoteQueue();
    expect(queue.peekBatch(5)).toEqual([]);
    expect(queue.isEmpty()).toBe(true);

    queue.enqueue(quote(1));
    queue.enqueue(quote(2));
    expect(queue.peekBatch(5)).toHaveLength(2);
  });

  test("reports overflow without dropping already queued records", () => {
    const queue = new MarketQuoteQueue(1);
    const first = quote(1);

    expect(queue.enqueue(first)).toBe(true);
    expect(queue.enqueue(quote(2))).toBe(false);
    expect(queue.overflowedCount).toBe(1);
    expect(queue.peekBatch(2)).toEqual([first]);
  });
});
