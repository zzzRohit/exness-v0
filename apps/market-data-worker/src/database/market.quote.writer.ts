import { Prisma, prisma } from "@exness/database";
import type { LatestBookTicker } from "../types/market.types.js";

export function buildMarketQuoteInsertStatement(
  quotes: readonly LatestBookTicker[],
) {
  if (quotes.length === 0) {
    return null;
  }

  const rows = quotes.map((quote) => Prisma.sql`(
    ${new Date(quote.receivedAt)},
    ${
      quote.exchangeEventTime === null
        ? null
        : new Date(quote.exchangeEventTime)
    },
    ${quote.asset},
    ${quote.bidPrice},
    ${quote.askPrice},
    ${quote.bidQuantity},
    ${quote.askQuantity},
    ${BigInt(quote.updateId)}
  )`);

  return Prisma.sql`
    INSERT INTO public.market_quotes (
      received_at,
      exchange_event_time,
      asset,
      bid_price,
      ask_price,
      bid_quantity,
      ask_quantity,
      update_id
    )
    VALUES ${Prisma.join(rows)}
  `;
}

export async function insertMarketQuotes(
  quotes: readonly LatestBookTicker[],
): Promise<void> {
  const statement = buildMarketQuoteInsertStatement(quotes);
  if (statement) {
    await prisma.$executeRaw(statement);
  }
}