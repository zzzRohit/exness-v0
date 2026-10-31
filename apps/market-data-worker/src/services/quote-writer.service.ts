import type { LatestBookTicker } from "../types/market.types.js";
import { marketQuoteQueue, type MarketQuoteQueue } from "../queue/market.queue.js";

export interface QuoteWriterOptions {
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
}

export interface QuoteWriterScheduler {
  startInterval(callback: () => void, intervalMs: number): () => void;
  delay(ms: number): Promise<void>;
}

export interface QuoteWriterLogger {
  info(message: string, details: Record<string, unknown>): void;
  warn(message: string, details: Record<string, unknown>): void;
  error(message: string, details: Record<string, unknown>): void;
}

type InsertBatch = (quotes: readonly LatestBookTicker[]) => Promise<void>;

const defaultOptions: QuoteWriterOptions = {
  batchSize: 200,
  flushIntervalMs: 500,
  maxRetries: 5,
  retryBaseDelayMs: 250,
  retryMaxDelayMs: 5_000,
};

const defaultScheduler: QuoteWriterScheduler = {
  startInterval(callback, intervalMs) {
    const timer = setInterval(callback, intervalMs);
    return () => clearInterval(timer);
  },
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const defaultLogger: QuoteWriterLogger = {
  info: (message, details) => console.info(message, details),
  warn: (message, details) => console.warn(message, details),
  error: (message, details) => console.error(message, details),
};

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

function retriesFromEnv(): number {
  const value = process.env.MARKET_QUOTE_MAX_RETRIES;
  if (value === undefined) {
    return defaultOptions.maxRetries;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 20) {
    throw new Error("MARKET_QUOTE_MAX_RETRIES must be an integer from 0 to 20.");
  }

  return parsed;
}

export const quoteWriterOptions: QuoteWriterOptions = {
  batchSize: positiveIntegerFromEnv(
    "MARKET_QUOTE_BATCH_SIZE",
    defaultOptions.batchSize,
  ),
  flushIntervalMs: positiveIntegerFromEnv(
    "MARKET_QUOTE_FLUSH_INTERVAL_MS",
    defaultOptions.flushIntervalMs,
  ),
  maxRetries: retriesFromEnv(),
  retryBaseDelayMs: positiveIntegerFromEnv(
    "MARKET_QUOTE_RETRY_BASE_DELAY_MS",
    defaultOptions.retryBaseDelayMs,
  ),
  retryMaxDelayMs: positiveIntegerFromEnv(
    "MARKET_QUOTE_RETRY_MAX_DELAY_MS",
    defaultOptions.retryMaxDelayMs,
  ),
};

export class QuoteWriterService {
  private cancelInterval: (() => void) | undefined;
  private inFlight: Promise<boolean> | undefined;
  private acceptedCount = 0;
  private successfulInserts = 0;
  private failedInserts = 0;
  private retryCount = 0;
  private lastSuccessfulPersistenceAt: string | null = null;

  constructor(
    private readonly insertBatch: InsertBatch,
    private readonly queue: MarketQuoteQueue = marketQuoteQueue,
    private readonly options: QuoteWriterOptions = quoteWriterOptions,
    private readonly scheduler: QuoteWriterScheduler = defaultScheduler,
    private readonly logger: QuoteWriterLogger = defaultLogger,
  ) {
    if (
      !Number.isSafeInteger(options.batchSize) ||
      options.batchSize <= 0 ||
      !Number.isSafeInteger(options.flushIntervalMs) ||
      options.flushIntervalMs <= 0 ||
      !Number.isSafeInteger(options.maxRetries) ||
      options.maxRetries < 0 ||
      !Number.isSafeInteger(options.retryBaseDelayMs) ||
      options.retryBaseDelayMs <= 0 ||
      !Number.isSafeInteger(options.retryMaxDelayMs) ||
      options.retryMaxDelayMs <= 0
    ) {
      throw new Error("Quote writer configuration values are invalid.");
    }
  }

  start(): void {
    if (this.cancelInterval) {
      return;
    }

    this.cancelInterval = this.scheduler.startInterval(() => {
      void this.flush(true);
    }, this.options.flushIntervalMs);
  }

  recordAcceptedQuote(): void {
    this.acceptedCount += 1;
  }

  notifyQueueChanged(): void {
    if (this.queue.size >= this.options.batchSize) {
      void this.flush(false);
    }
  }

  async flush(includePartialBatch: boolean): Promise<boolean> {
    if (this.inFlight) {
      const currentResult = await this.inFlight;
      if (
        !includePartialBatch ||
        !currentResult ||
        this.queue.isEmpty()
      ) {
        return currentResult;
      }

      return this.flush(true);
    }

    this.inFlight = this.drain(includePartialBatch);
    try {
      return await this.inFlight;
    } finally {
      this.inFlight = undefined;
    }
  }

  async stop(): Promise<boolean> {
    this.cancelInterval?.();
    this.cancelInterval = undefined;

    if (this.inFlight) {
      await this.inFlight;
    }

    return this.flush(true);
  }

  private async drain(includePartialBatch: boolean): Promise<boolean> {
    while (
      this.queue.size >= this.options.batchSize ||
      (includePartialBatch && !this.queue.isEmpty())
    ) {
      const claim = this.queue.claimBatch(this.options.batchSize);
      if (!claim) {
        return true;
      }

      const batch = claim.quotes;
      const startedAt = Date.now();
      const inserted = await this.insertWithRetries(batch);
      const durationMs = Date.now() - startedAt;

      if (!inserted) {
        this.queue.releaseClaim(claim.id);
        this.failedInserts += 1;
        this.logger.error("Quote batch persistence exhausted retries.", {
          batchSize: batch.length,
          queueSize: this.queue.size,
          failedInserts: this.failedInserts,
          retryCount: this.retryCount,
          durationMs,
        });
        return false;
      }

      this.queue.acknowledgeClaim(claim.id);
      this.successfulInserts += batch.length;
      this.lastSuccessfulPersistenceAt = new Date().toISOString();
      this.logger.info("Persisted market quote batch.", {
        totalAcceptedQuotes: this.acceptedCount,
        totalQueuedQuotes: this.queue.queuedCount,
        queueSize: this.queue.size,
        batchSize: batch.length,
        successfulInserts: this.successfulInserts,
        failedInserts: this.failedInserts,
        retryCount: this.retryCount,
        durationMs,
        lastSuccessfulPersistenceAt: this.lastSuccessfulPersistenceAt,
      });

      if (!includePartialBatch && this.queue.size < this.options.batchSize) {
        return true;
      }
    }

    return true;
  }

  private async insertWithRetries(
    batch: readonly LatestBookTicker[],
  ): Promise<boolean> {
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        await this.insertBatch(batch);
        return true;
      } catch (error) {
        if (attempt === this.options.maxRetries) {
          return false;
        }

        const delayMs = Math.min(
          this.options.retryBaseDelayMs * 2 ** attempt,
          this.options.retryMaxDelayMs,
        );
        this.retryCount += 1;
        this.logger.warn("Quote batch insert failed; retrying.", {
          batchSize: batch.length,
          retry: attempt + 1,
          maxRetries: this.options.maxRetries,
          delayMs,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        await this.scheduler.delay(delayMs);
      }
    }

    return false;
  }
}
