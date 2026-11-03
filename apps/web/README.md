# Exness V0 Web

Responsive React trading terminal based on the Figma trading, sign-up, and sign-in frames. Market quotes, candles, demo positions, and trade history are local mock data; the frontend does not connect to Binance, the market-data worker, or the realtime app.

## Run locally

From the repository root:

```powershell
Copy-Item apps\web\.env.example apps\web\.env
bun run --cwd apps/web dev
```

The Vite development server runs on `http://localhost:5173`. Configure `VITE_API_BASE_URL` in `apps/web/.env` to the origin of the API. Start the API separately with its required root `.env` and database:

```powershell
bun run --cwd apps/api dev
```

## Frontend flows

- `/` opens the demo terminal without requiring authentication. The initial demo cash balance is `$5,000.00 USD`.
- Use the instrument list, timeframe controls, market/pending order controls, and activity tabs to exercise the mock terminal.
- Select **REAL** in the account menu to view the real-account placeholder; no real balance, deposits, or trades are simulated.
- `/signup` posts `{ name, email, password }` to `POST /api/v1/auth/signup`.
- `/signin` posts `{ email, password }` to `POST /api/v1/auth/login`.
- Both requests use `credentials: "include"` for the API's HTTP-only `access_token` cookie. Tokens are never read or stored by the frontend.
- The API does not currently expose session restoration, logout, or password-recovery endpoints, so those behaviors are not claimed or simulated.

## Checks

```powershell
bun run --cwd apps/web typecheck
bun run --cwd apps/web build
```

The frontend uses `lightweight-charts` for locally generated OHLC candles. Live market streaming and real-account integration remain future work.
