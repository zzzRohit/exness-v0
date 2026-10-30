# Exness V0

A Bun-managed TypeScript monorepo for building the Exness V0 application. The repository currently contains application boundaries and development configuration only; it does not yet implement trading, market data, or persistence features.

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
| `apps/api` | Express REST API scaffold |
| `apps/realtime` | Future WebSocket gateway boundary |
| `apps/market-data-worker` | Future Binance market-data boundary |
| `apps/batch-uploader` | Future candle-persistence boundary |
| `packages/database` | PostgreSQL and schema-free Prisma configuration |
| `packages/shared-types` | Shared TypeScript contracts |
| `packages/config` | Shared TypeScript compiler settings |

The backend workers and gateway are placeholders. WebSockets, Binance integration, candle processing, trading endpoints, and background jobs are intentionally not implemented.

## Commands

Run all development workspaces:

```powershell
bun run dev
```

Run one app:

```powershell
bun run --filter @exness/web dev
bun run --filter @exness/api dev
```

Check types and build all workspaces with the corresponding scripts:

```powershell
bun run typecheck
bun run build
```

The web app is available at the Vite URL printed in the terminal. The API scaffold listens on the port configured by `API_PORT` (default `4000`).

## Prisma initialization

`packages/database/prisma.config.ts` is configured for PostgreSQL through `DATABASE_URL`. Prisma, its PostgreSQL adapter, and the PostgreSQL driver are installed, but `schema.prisma`, models, migrations, and seed files are deliberately absent. Prisma schema commands are not part of the initial setup; they will be added when we intentionally define the first database model.

## Scope

V0 feature work will cover signup/signin, historical candles, account balance, opening and closing orders, and listing orders. Live quotes and batch candle persistence are later boundaries. No Redis, messaging service, P&L, leverage, margin, or advanced risk features are configured here.
