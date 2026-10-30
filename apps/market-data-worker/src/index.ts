import { connectToBinance } from "./exchange/binance.js";
import { updateLatestBookTicker } from "./services/price.service.js";
import { marketQuoteQueue } from "./queue/market.queue.js";
import type { NormalizedTradeInput } from "./types/market.types.js";

const stop = connectToBinance(
  (trade: NormalizedTradeInput) => {
    // console.log("Normalized trade:", trade);
  },
  (quote) => {
    const latestQuote = updateLatestBookTicker(quote);
    if (latestQuote) {
      const enqueued = marketQuoteQueue.enqueue(latestQuote);

      if (!enqueued) {
        console.error("Market quote queue is full. Quote was not enqueued:", {
          asset: latestQuote.asset,
          updateId: latestQuote.updateId,
        });
      }
    }
  },
);

function shutdown(): void {
  console.log("Shutting down market-data worker...");
  stop();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
