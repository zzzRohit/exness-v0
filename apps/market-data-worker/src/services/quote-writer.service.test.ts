import { describe, expect, test } from "bun:test";
import {
  QuoteWriterService,
  type QuoteWriterLogger,
  type QuoteWriterOptions,
  type QuoteWriterScheduler,
} from "./quote-writer.service.js";
import { MarketQuoteQueue } from "../queue/market.queue.js";
import type { LatestBookTicker } from "../types/market.types.js";

const options: QuoteWriterOptions = {
  batchSize: 2,
  flushIntervalMs: 500,
  maxRetries: 1,
  retryBaseDelayMs: 10,
  retryMaxDelayMs: 20,
};

const silentLogger: QuoteWriterLogger = {
  info() {},
  warn() {},
  error() {},
};

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

function fakeScheduler() {
  let intervalCallback: (() => void) | undefined;
  const delays: number[] = [];
  const scheduler: QuoteWriterScheduler = {
    startInterval(callback, intervalMs) {
      expect(intervalMs).toBe(options.flushIntervalMs);
      intervalCallback = callback;
      return () => {
        intervalCallback = undefined;
      };
    },
    async delay(ms) {
      delays.push(ms);
    },
  };

  return {
    scheduler,
    delays,
    tick() {
      intervalCallback?.();
    },
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("QuoteWriterService", () => {
  test("acknowledges records only after a successful insert", async () => {
    const queue = new MarketQuoteQueue();
    const inserted = deferred();
    queue.enqueue(quote(1));
    let insertStarted = false;
    const writer = new QuoteWriterService(
      async (batch) => {
        expect(batch).toHaveLength(1);
        insertStarted = true;
        await inserted.promise;
      },
      queue,
      options,
      fakeScheduler().scheduler,
      silentLogger,
    );

    const flushing = writer.flush(true);
    await Promise.resolve();
    expect(insertStarted).toBe(true);
    expect(queue.size).toBe(1);

    inserted.resolve();
    expect(await flushing).toBe(true);
    expect(queue.isEmpty()).toBe(true);
  });

  test("retries failed inserts and acknowledges after the retry succeeds", async () => {
    const queue = new MarketQuoteQueue();
    const fake = fakeScheduler();
    queue.enqueue(quote(1));
    let attempts = 0;
    const writer = new QuoteWriterService(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("temporary database failure");
        }
      },
      queue,
      options,
      fake.scheduler,
      silentLogger,
    );

    expect(await writer.flush(true)).toBe(true);
    expect(attempts).toBe(2);
    expect(fake.delays).toEqual([10]);
    expect(queue.isEmpty()).toBe(true);
  });

  test("keeps records queued after bounded retries are exhausted", async () => {
    const queue = new MarketQuoteQueue();
    const fake = fakeScheduler();
    const first = quote(1);
    queue.enqueue(first);
    const writer = new QuoteWriterService(
      async () => {
        throw new Error("database unavailable");
      },
      queue,
      options,
      fake.scheduler,
      silentLogger,
    );

    expect(await writer.flush(true)).toBe(false);
    expect(queue.peekBatch(1)).toEqual([first]);
    expect(fake.delays).toEqual([10]);
  });

  test("prevents overlapping batch inserts", async () => {
    const queue = new MarketQuoteQueue();
    const inserted = deferred();
    queue.enqueue(quote(1));
    queue.enqueue(quote(2));
    let calls = 0;
    const writer = new QuoteWriterService(
      async () => {
        calls += 1;
        await inserted.promise;
      },
      queue,
      options,
      fakeScheduler().scheduler,
      silentLogger,
    );

    const firstFlush = writer.flush(true);
    const overlappingFlush = writer.flush(true);
    await Promise.resolve();
    expect(calls).toBe(1);

    inserted.resolve();
    expect(await Promise.all([firstFlush, overlappingFlush])).toEqual([
      true,
      true,
    ]);
    expect(calls).toBe(1);
    expect(queue.isEmpty()).toBe(true);
  });

  test("prevents separate writers from claiming the same batch", async () => {
    const queue = new MarketQuoteQueue();
    const inserted = deferred();
    queue.enqueue(quote(1));
    let firstWriterCalls = 0;
    let secondWriterCalls = 0;
    const firstWriter = new QuoteWriterService(
      async () => {
        firstWriterCalls += 1;
        await inserted.promise;
      },
      queue,
      options,
      fakeScheduler().scheduler,
      silentLogger,
    );
    const secondWriter = new QuoteWriterService(
      async () => {
        secondWriterCalls += 1;
      },
      queue,
      options,
      fakeScheduler().scheduler,
      silentLogger,
    );

    const firstFlush = firstWriter.flush(true);
    expect(await secondWriter.flush(true)).toBe(true);
    expect(secondWriterCalls).toBe(0);

    inserted.resolve();
    expect(await firstFlush).toBe(true);
    expect(firstWriterCalls).toBe(1);
    expect(queue.isEmpty()).toBe(true);
  });

  test("flushes a partial batch on the configured interval", async () => {
    const queue = new MarketQuoteQueue();
    const fake = fakeScheduler();
    queue.enqueue(quote(1));
    let insertedCount = 0;
    const writer = new QuoteWriterService(
      async (batch) => {
        insertedCount += batch.length;
      },
      queue,
      options,
      fake.scheduler,
      silentLogger,
    );
    writer.start();

    fake.tick();
    expect(await writer.flush(true)).toBe(true);
    expect(insertedCount).toBe(1);
    expect(queue.isEmpty()).toBe(true);
  });

  test("flushes remaining records during graceful shutdown", async () => {
    const queue = new MarketQuoteQueue();
    queue.enqueue(quote(1));
    let insertedCount = 0;
    const writer = new QuoteWriterService(
      async (batch) => {
        insertedCount += batch.length;
      },
      queue,
      options,
      fakeScheduler().scheduler,
      silentLogger,
    );
    writer.start();

    expect(await writer.stop()).toBe(true);
    expect(insertedCount).toBe(1);
    expect(queue.isEmpty()).toBe(true);
  });
});
