import { prisma } from "@exness/database";

try {
  const [state] = await prisma.$queryRaw<
    { timescaledbAvailable: boolean; tableExists: boolean }[]
  >`
    SELECT
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
        AS "timescaledbAvailable",
      to_regclass('public.market_quotes') IS NOT NULL AS "tableExists"
  `;

  if (!state?.timescaledbAvailable || !state.tableExists) {
    console.error("Quote storage is not ready.", {
      timescaledbAvailable: state?.timescaledbAvailable ?? false,
      tableExists: state?.tableExists ?? false,
    });
    process.exitCode = 1;
  } else {
    const [hypertable] = await prisma.$queryRaw<{ isHypertable: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
          AND hypertable_name = 'market_quotes'
      ) AS "isHypertable"
    `;

    if (!hypertable?.isHypertable) {
      console.error("public.market_quotes exists but is not a hypertable.");
      process.exitCode = 1;
    } else {
      const recentQuotes = await prisma.$queryRaw`
        SELECT
          received_at,
          exchange_event_time,
          asset,
          bid_price,
          ask_price,
          bid_quantity,
          ask_quantity,
          update_id
        FROM public.market_quotes
        ORDER BY received_at DESC
        LIMIT 20
      `;
      const assetSummary = await prisma.$queryRaw`
        SELECT
          asset,
          COUNT(*) AS quote_count,
          MIN(received_at) AS first_quote,
          MAX(received_at) AS latest_quote
        FROM public.market_quotes
        GROUP BY asset
        ORDER BY asset
      `;

      console.log(
        JSON.stringify(
          { isHypertable: true, recentQuotes, assetSummary },
          (_key, value: unknown) =>
            typeof value === "bigint" ? value.toString() : value,
          2,
        ),
      );
    }
  }
} finally {
  await prisma.$disconnect();
}
