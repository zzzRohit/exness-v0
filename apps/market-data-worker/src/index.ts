import { prisma } from "@exness/database";
import { insertMarketQuotes } from "./database/market.quote.writer.js";
import { processNextCandleQuoteBatch } from "./database/candle.aggregation.repository.js";
import { connectToBinance } from "./exchange/binance.js";
import { marketQuoteQueue } from "./queue/market.queue.js";
import {
  CandleAggregationService,
  candleAggregationOptions,
} from "./services/candle-aggregation.service.js";
import {
  QuoteWriterService,
  quoteWriterOptions,
} from "./services/quote-writer.service.js";
import { updateLatestBookTicker } from "./services/price.service.js";
const quoteWriter = new QuoteWriterService(
  insertMarketQuotes,
  marketQuoteQueue,
  quoteWriterOptions,
);
const candleAggregation = new CandleAggregationService(
  { processNextBatch: processNextCandleQuoteBatch },
  candleAggregationOptions,
);
let acceptingQuotes = true;
let shutdownPromise: Promise<void> | undefined;

quoteWriter.start();
candleAggregation.start();

const stop = connectToBinance((quote) => {
  if (!acceptingQuotes) {
    return;
  }

  const latestQuote = updateLatestBookTicker(quote);
  if (latestQuote) {
    quoteWriter.recordAcceptedQuote();
    const enqueued = marketQuoteQueue.enqueue(latestQuote);

    if (!enqueued) {
      const overflowedCount = marketQuoteQueue.overflowedCount;
      if (overflowedCount === 1 || overflowedCount % 100 === 0) {
        console.error(
          "Market quote queue is full; updates were not persisted.",
          {
            overflowedQuotes: overflowedCount,
            queueSize: marketQuoteQueue.size,
            maxQueueSize: process.env.MARKET_QUOTE_QUEUE_MAX_SIZE ?? 10_000,
          },
        );
      }
    } else {
      quoteWriter.notifyQueueChanged();
    }
  }
});

function shutdown(): Promise<void> {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  acceptingQuotes = false;
  stop();

  shutdownPromise = (async () => {
    console.log("Shutting down market-data worker...");
    try {
      const drained = await quoteWriter.stop();
      if (!drained || !marketQuoteQueue.isEmpty()) {
        console.error("Shutdown left quotes unpersisted.", {
          pendingQuotes: marketQuoteQueue.size,
        });
        process.exitCode = 1;
      }
    } finally {
      try {
        await candleAggregation.stop();
      } finally {
        await prisma.$disconnect();
      }
    }
  })();

  return shutdownPromise;
}

function handleShutdown(): void {
  void shutdown().catch((error: unknown) => {
    console.error("Market-data worker shutdown failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  });
}

process.once("SIGINT", handleShutdown);
process.once("SIGTERM", handleShutdown);
