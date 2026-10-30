
import type { LatestBookTicker } from "../types/market.types.js";

const MAX_QUEUE_SIZE = 10_000;

class MarketQuoteQueue {
  private queue: LatestBookTicker[] = [];

  enqueue(quote: LatestBookTicker): boolean {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }

    this.queue.push(quote);
    return true;
  }

  dequeueBatch(batchSize: number): LatestBookTicker[] {
    if (batchSize <= 0) {
      return [];
    }

    return this.queue.splice(0, batchSize);
  }

  get size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

export const marketQuoteQueue = new MarketQuoteQueue();
