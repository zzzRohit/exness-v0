
import type { LatestBookTicker } from "../types/market.types.js";

export interface ClaimedMarketQuoteBatch {
  id: number;
  quotes: LatestBookTicker[];
}

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }

  return parsed;
}

export class MarketQuoteQueue {
  private queue: LatestBookTicker[] = [];
  private totalEnqueued = 0;
  private overflowCount = 0;
  private nextBatchId = 1;
  private claimedBatch: ClaimedMarketQuoteBatch | undefined;

  constructor(private readonly maxSize = 10_000) {
    if (!Number.isSafeInteger(maxSize) || maxSize <= 0) {
      throw new Error("Queue maxSize must be a positive safe integer.");
    }
  }

  enqueue(quote: LatestBookTicker): boolean {
    if (this.queue.length >= this.maxSize) {
      this.overflowCount += 1;
      return false;
    }

    this.queue.push(quote);
    this.totalEnqueued += 1;
    return true;
  }

  peekBatch(batchSize: number): LatestBookTicker[] {
    if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
      return [];
    }

    return this.queue.slice(0, batchSize);
  }

  claimBatch(batchSize: number): ClaimedMarketQuoteBatch | null {
    if (this.claimedBatch) {
      return null;
    }

    const quotes = this.peekBatch(batchSize);
    if (quotes.length === 0) {
      return null;
    }

    const batch = { id: this.nextBatchId, quotes };
    this.nextBatchId += 1;
    this.claimedBatch = batch;
    return batch;
  }

  acknowledgeClaim(batchId: number): void {
    const batch = this.requireClaim(batchId);
    this.queue.splice(0, batch.quotes.length);
    this.claimedBatch = undefined;
  }

  releaseClaim(batchId: number): void {
    this.requireClaim(batchId);
    this.claimedBatch = undefined;
  }

  acknowledgeBatch(batchSize: number): void {
    if (this.claimedBatch) {
      throw new Error("Cannot acknowledge while a quote batch is claimed.");
    }

    if (
      !Number.isSafeInteger(batchSize) ||
      batchSize < 0 ||
      batchSize > this.queue.length
    ) {
      throw new Error("Cannot acknowledge a batch larger than the queue.");
    }

    this.queue.splice(0, batchSize);
  }

  private requireClaim(batchId: number): ClaimedMarketQuoteBatch {
    if (!this.claimedBatch || this.claimedBatch.id !== batchId) {
      throw new Error("Quote batch claim is missing or no longer active.");
    }

    return this.claimedBatch;
  }

  get size(): number {
    return this.queue.length;
  }

  get queuedCount(): number {
    return this.totalEnqueued;
  }

  get overflowedCount(): number {
    return this.overflowCount;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

export const marketQuoteQueue = new MarketQuoteQueue(
  positiveIntegerFromEnv("MARKET_QUOTE_QUEUE_MAX_SIZE", 10_000),
);
