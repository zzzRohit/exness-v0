import { Prisma, prisma } from "@exness/database";
import { aggregatePersistedQuotes } from "../services/candle.service.js";
import type { PersistedMarketQuote } from "../types/market.types.js";

interface MarketQuoteRow {
  ingest_id: bigint;
  received_at: Date;
  asset: PersistedMarketQuote["asset"];
  update_id: bigint;
  bid_price: bigint;
  ask_price: bigint;
}

interface CheckpointRow {
  last_ingest_id: bigint;
}

export async function processNextCandleQuoteBatch(
  batchSize: number,
): Promise<number> {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Candle aggregation batch size must be a positive integer.");
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO public.candle_aggregation_checkpoint (
        consumer_name,
        last_ingest_id
      )
      VALUES ('market_quotes', 0)
      ON CONFLICT (consumer_name) DO NOTHING
    `;

    const [checkpoint] = await transaction.$queryRaw<CheckpointRow[]>`
      SELECT last_ingest_id
      FROM public.candle_aggregation_checkpoint
      WHERE consumer_name = 'market_quotes'
      FOR UPDATE
    `;
    if (!checkpoint) {
      throw new Error("Failed to load the candle aggregation checkpoint.");
    }

    const rows = await transaction.$queryRaw<MarketQuoteRow[]>`
      SELECT
        ingest_id,
        received_at,
        asset,
        update_id,
        bid_price,
        ask_price
      FROM public.market_quotes
      WHERE ingest_id > ${checkpoint.last_ingest_id}
      ORDER BY ingest_id ASC
      LIMIT ${batchSize}
    `;
    if (rows.length === 0) {
      return 0;
    }

    const quotes: PersistedMarketQuote[] = rows.map((row) => {
      const updateId = Number(row.update_id);
      if (!Number.isSafeInteger(updateId)) {
        throw new Error(
          `Quote update ID ${row.update_id.toString()} cannot be represented safely.`,
        );
      }

      return {
        ingestId: row.ingest_id,
        asset: row.asset,
        receivedAt: row.received_at.getTime(),
        updateId,
        bidPrice: row.bid_price,
        askPrice: row.ask_price,
      };
    });

    const candles = aggregatePersistedQuotes(quotes);
    if (candles.length > 0) {
      const candleRows = candles.map(
        (candle) => Prisma.sql`(
          ${candle.asset},
          ${candle.interval},
          ${new Date(candle.startTime)},
          ${candle.bidOpen},
          ${candle.bidHigh},
          ${candle.bidLow},
          ${candle.bidClose},
          ${candle.askOpen},
          ${candle.askHigh},
          ${candle.askLow},
          ${candle.askClose},
          ${candle.quoteCount},
          ${new Date(candle.firstReceivedAt)},
          ${BigInt(candle.firstUpdateId)},
          ${new Date(candle.lastReceivedAt)},
          ${BigInt(candle.lastUpdateId)}
        )`,
      );

      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO public.market_candles AS current_candle (
          asset,
          "interval",
          start_time,
          bid_open,
          bid_high,
          bid_low,
          bid_close,
          ask_open,
          ask_high,
          ask_low,
          ask_close,
          quote_count,
          first_received_at,
          first_update_id,
          last_received_at,
          last_update_id
        )
        VALUES ${Prisma.join(candleRows)}
        ON CONFLICT (asset, "interval", start_time) DO UPDATE SET
          bid_open = CASE
            WHEN (EXCLUDED.first_received_at, EXCLUDED.first_update_id)
              < (current_candle.first_received_at, current_candle.first_update_id)
            THEN EXCLUDED.bid_open
            ELSE current_candle.bid_open
          END,
          bid_high = GREATEST(current_candle.bid_high, EXCLUDED.bid_high),
          bid_low = LEAST(current_candle.bid_low, EXCLUDED.bid_low),
          bid_close = CASE
            WHEN (EXCLUDED.last_received_at, EXCLUDED.last_update_id)
              > (current_candle.last_received_at, current_candle.last_update_id)
            THEN EXCLUDED.bid_close
            ELSE current_candle.bid_close
          END,
          ask_open = CASE
            WHEN (EXCLUDED.first_received_at, EXCLUDED.first_update_id)
              < (current_candle.first_received_at, current_candle.first_update_id)
            THEN EXCLUDED.ask_open
            ELSE current_candle.ask_open
          END,
          ask_high = GREATEST(current_candle.ask_high, EXCLUDED.ask_high),
          ask_low = LEAST(current_candle.ask_low, EXCLUDED.ask_low),
          ask_close = CASE
            WHEN (EXCLUDED.last_received_at, EXCLUDED.last_update_id)
              > (current_candle.last_received_at, current_candle.last_update_id)
            THEN EXCLUDED.ask_close
            ELSE current_candle.ask_close
          END,
          quote_count = current_candle.quote_count + EXCLUDED.quote_count,
          first_received_at = LEAST(
            current_candle.first_received_at,
            EXCLUDED.first_received_at
          ),
          first_update_id = CASE
            WHEN (EXCLUDED.first_received_at, EXCLUDED.first_update_id)
              < (current_candle.first_received_at, current_candle.first_update_id)
            THEN EXCLUDED.first_update_id
            ELSE current_candle.first_update_id
          END,
          last_received_at = GREATEST(
            current_candle.last_received_at,
            EXCLUDED.last_received_at
          ),
          last_update_id = CASE
            WHEN (EXCLUDED.last_received_at, EXCLUDED.last_update_id)
              > (current_candle.last_received_at, current_candle.last_update_id)
            THEN EXCLUDED.last_update_id
            ELSE current_candle.last_update_id
          END,
          updated_at = CURRENT_TIMESTAMP
      `);
    }

    const lastIngestId = rows[rows.length - 1]!.ingest_id;
    await transaction.$executeRaw`
      UPDATE public.candle_aggregation_checkpoint
      SET last_ingest_id = ${lastIngestId},
          updated_at = CURRENT_TIMESTAMP
      WHERE consumer_name = 'market_quotes'
    `;

    return rows.length;
  });
}
