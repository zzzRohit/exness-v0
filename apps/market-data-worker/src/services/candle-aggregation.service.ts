export interface CandleBatchProcessor {
  processNextBatch(batchSize: number): Promise<number>;
}

export interface CandleAggregationLogger {
  error(message: string, details: Record<string, unknown>): void;
}

export interface CandleAggregationOptions {
  batchSize: number;
  pollIntervalMs: number;
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

export const candleAggregationOptions: CandleAggregationOptions = {
  batchSize: positiveIntegerFromEnv("CANDLE_AGGREGATION_BATCH_SIZE", 500),
  pollIntervalMs: positiveIntegerFromEnv(
    "CANDLE_AGGREGATION_POLL_INTERVAL_MS",
    1_000,
  ),
};

const defaultLogger: CandleAggregationLogger = {
  error: (message, details) => console.error(message, details),
};

export class CandleAggregationService {
  private interval: ReturnType<typeof setInterval> | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly processor: CandleBatchProcessor,
    private readonly options: CandleAggregationOptions =
      candleAggregationOptions,
    private readonly logger: CandleAggregationLogger = defaultLogger,
  ) {
    if (
      !Number.isSafeInteger(options.batchSize) ||
      options.batchSize <= 0 ||
      !Number.isSafeInteger(options.pollIntervalMs) ||
      options.pollIntervalMs <= 0
    ) {
      throw new Error("Candle aggregation options must be positive integers.");
    }
  }

  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(
      () => this.scheduleDrain(),
      this.options.pollIntervalMs,
    );
    this.scheduleDrain();
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    await this.inFlight;
    await this.drain();
  }

  private scheduleDrain(): void {
    if (this.inFlight) {
      return;
    }

    this.inFlight = this.drain()
      .catch((error: unknown) => {
        this.logger.error("Candle aggregation batch failed.", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      })
      .finally(() => {
        this.inFlight = undefined;
      });
  }

  private async drain(): Promise<void> {
    let processed: number;
    do {
      processed = await this.processor.processNextBatch(this.options.batchSize);
    } while (processed === this.options.batchSize);
  }
}
