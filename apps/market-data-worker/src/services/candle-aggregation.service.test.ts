import { describe, expect, test } from "bun:test";
import {
  CandleAggregationService,
  type CandleAggregationLogger,
} from "./candle-aggregation.service.js";

const logger: CandleAggregationLogger = {
  error() {},
};

describe("CandleAggregationService", () => {
  test("processes bounded pages until caught up without overlapping runs", async () => {
    const pageSizes = [2, 2, 1, 0];
    let activeCalls = 0;
    let maxActiveCalls = 0;
    const service = new CandleAggregationService(
      {
        async processNextBatch(batchSize) {
          expect(batchSize).toBe(2);
          activeCalls += 1;
          maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
          await Promise.resolve();
          activeCalls -= 1;
          return pageSizes.shift() ?? 0;
        },
      },
      { batchSize: 2, pollIntervalMs: 1_000 },
      logger,
    );

    service.start();
    await service.stop();

    expect(pageSizes).toEqual([]);
    expect(maxActiveCalls).toBe(1);
  });

  test("resumes from durable processor state after service restart", async () => {
    const persistedIngestIds = [1n, 2n, 3n];
    let durableCheckpoint = 1n;
    const processedIds: bigint[] = [];

    const makeService = () =>
      new CandleAggregationService(
        {
          async processNextBatch(batchSize) {
            const page = persistedIngestIds
              .filter((id) => id > durableCheckpoint)
              .slice(0, batchSize);
            if (page.length > 0) {
              processedIds.push(...page);
              durableCheckpoint = page[page.length - 1]!;
            }
            return page.length;
          },
        },
        { batchSize: 2, pollIntervalMs: 1_000 },
        logger,
      );

    const firstRun = makeService();
    await firstRun.stop();
    const restarted = makeService();
    await restarted.stop();

    expect(processedIds).toEqual([2n, 3n]);
    expect(durableCheckpoint).toBe(3n);
  });

  test("logs a failed aggregation attempt and retries without stopping the service", async () => {
    let attempts = 0;
    let failures = 0;
    const service = new CandleAggregationService(
      {
        async processNextBatch() {
          attempts += 1;
          if (attempts === 1) {
            throw new Error("temporary database failure");
          }
          return 0;
        },
      },
      { batchSize: 2, pollIntervalMs: 1_000 },
      {
        error() {
          failures += 1;
        },
      },
    );

    service.start();
    await service.stop();

    expect(attempts).toBe(2);
    expect(failures).toBe(1);
  });
});
