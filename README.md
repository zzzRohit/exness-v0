# Exness V0

A Bun-managed TypeScript monorepo for the Exness V0 application, including a Binance market-data worker that persists bookTicker quotes and aggregates bid/ask candles.

## Requirements

- Bun 1.3.13 or a compatible newer 1.x release
- Docker Desktop (optional, for local PostgreSQL)

## Setup

```powershell
bun install
```

Copy `.env.example` to `.env` only if `.env` does not already exist. If you already have a local `.env`, keep it and add the PostgreSQL settings from the example. Replace the placeholder username and password, and keep `DATABASE_URL` in sync with the PostgreSQL user, password, and database.

Start PostgreSQL when you are ready to use it:

```powershell
docker compose up -d postgres
```

The Compose file starts only PostgreSQL and keeps the existing PostgreSQL 16 image and volume. No Prisma schema or database tables are created by setup.
PostgreSQL's initialization variables are used only when its data volume is empty. If you already have that volume, set the same user and password it was initialized with; this setup does not delete or migrate it.

## Workspaces

| Workspace | Purpose |
| --- | --- |
| `apps/web` | React + Vite frontend |
| `apps/api` | Express API with signup and login |
| `apps/realtime` | Future WebSocket gateway boundary |
| `apps/market-data-worker` | Binance bookTicker ingestion and historical candle aggregation |
| `apps/batch-uploader` | Future candle-persistence boundary |
| `packages/database` | PostgreSQL and schema-free Prisma configuration |
| `packages/shared-types` | Shared TypeScript contracts |
| `packages/config` | Shared TypeScript compiler settings |

The API currently provides signup and login; the realtime gateway and batch uploader are still scaffolds. The market-data worker subscribes to BTCUSDT, ETHUSDT, and SOLUSDT bookTicker streams, persists quotes, and maintains 1m, 5m, 30m, 1d, and 1w bid/ask candles.

## Commands

Run all development workspaces:

```powershell
bun run dev
```

Run one app:

```powershell
bun run --filter @exness/web dev
bun run --filter @exness/api dev
bun run --filter @exness/market-data-worker dev
```

The API exposes `POST /api/v1/auth/signup` (name, email, password) and
`POST /api/v1/auth/login` (email, password). It sets an HTTP-only
`access_token` cookie; browser clients must send requests with credentials
included. Apply the pending Prisma migration before using signup against a
database created from the prior schema.

```powershell
curl.exe -i -X POST http://localhost:4000/api/v1/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"Rohit","email":"rohit@example.com","password":"SecurePassword123"}'
```

Check types and build all workspaces with the corresponding scripts:

```powershell
bun run typecheck
bun run build
```

The web app is available at the Vite URL printed in the terminal. The API scaffold listens on the port configured by `API_PORT` (default `4000`). The market-data worker requires `DATABASE_URL` to point to a PostgreSQL database with TimescaleDB enabled.

## Prisma initialization

`packages/database/prisma.config.ts` uses `DATABASE_URL`. The Prisma schema and migrations define the market quote, candle, and application tables. The market-data migrations require TimescaleDB and create `market_quotes` and `market_candles` as hypertables; apply them from `packages/database` with `bunx prisma migrate deploy` against the TimescaleDB database.

The worker aggregates persisted quotes in bounded batches. Its `CANDLE_AGGREGATION_BATCH_SIZE` and `CANDLE_AGGREGATION_POLL_INTERVAL_MS` settings default to 500 and 1000 ms. Candles are provisional and are updated when additional quotes arrive, including late-arriving quotes. To inspect results:

```sql
SELECT asset, "interval", start_time, bid_open, bid_high, bid_low, bid_close,
       ask_open, ask_high, ask_low, ask_close, quote_count
FROM public.market_candles
ORDER BY start_time DESC
LIMIT 20;

SELECT consumer_name, last_ingest_id, updated_at
FROM public.candle_aggregation_checkpoint;
```

## Scope

V0 feature work will cover signup/signin, historical candles, account balance, opening and closing orders, and listing orders. No Redis, messaging service, P&L, leverage, margin, or advanced risk features are configured here.
