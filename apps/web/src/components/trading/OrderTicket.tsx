import { useMemo, useState, type FormEvent } from "react";
import type { MarketAsset, PendingOrder, TradeSide } from "../../types/market";
import type { AccountMode } from "../accounts/AccountSelector";

interface OrderTicketProps {
  asset: MarketAsset;
  mode: AccountMode;
  balance: number;
  onMarketOrder: (side: TradeSide, volume: number, stopLoss?: number, takeProfit?: number) => void;
  onPendingOrder: (order: Omit<PendingOrder, "id" | "createdAt">) => void;
  onToast: (message: string) => void;
}

const volumePresets = ["0.01", "0.05", "0.10", "0.50"];

export function OrderTicket({
  asset,
  mode,
  balance,
  onMarketOrder,
  onPendingOrder,
  onToast,
}: OrderTicketProps) {
  const [orderKind, setOrderKind] = useState<"market" | "pending">("market");
  const [volume, setVolume] = useState("0.10");
  const [pendingPrice, setPendingPrice] = useState(asset.bid.toFixed(asset.precision));
  const [stopEnabled, setStopEnabled] = useState(false);
  const [takeEnabled, setTakeEnabled] = useState(false);
  const [selectedSide, setSelectedSide] = useState<TradeSide>("buy");
  const [stopLoss, setStopLoss] = useState((asset.bid * 0.992).toFixed(asset.precision));
  const [takeProfit, setTakeProfit] = useState((asset.bid * 1.012).toFixed(asset.precision));
  const [error, setError] = useState("");

  const unitsPerLot = asset.category === "crypto" ? 1 : 100;
  const numericVolume = Number(volume);
  const orderValue = Number.isFinite(numericVolume) ? numericVolume * asset.bid * unitsPerLot : 0;
  const estimatedMargin = orderValue / 100;
  const spread = useMemo(() => asset.ask - asset.bid, [asset.ask, asset.bid]);
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: asset.precision,
    maximumFractionDigits: asset.precision,
  });

  function submit(side: TradeSide) {
    if (mode === "real") {
      onToast("Real account trading is not available yet. Switch to Demo to place a simulated order.");
      return;
    }

    const parsedVolume = Number(volume);
    if (!Number.isFinite(parsedVolume) || parsedVolume <= 0 || parsedVolume > 100) {
      setError("Enter a volume greater than 0 and no more than 100 lots.");
      return;
    }
    setError("");

    if (orderKind === "pending") {
      const price = Number(pendingPrice);
      if (!Number.isFinite(price) || price <= 0) {
        setError("Enter a valid pending order price.");
        return;
      }
      onPendingOrder({
        symbol: asset.symbol,
        side,
        volume: parsedVolume,
        entryPrice: price,
      });
      onToast(`${side === "buy" ? "Buy" : "Sell"} limit order added to pending orders.`);
      return;
    }

    onMarketOrder(
      side,
      parsedVolume,
      stopEnabled ? Number(stopLoss) : undefined,
      takeEnabled ? Number(takeProfit) : undefined,
    );
    onToast(`Simulated ${side.toUpperCase()} order opened for ${parsedVolume.toFixed(2)} lots.`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(selectedSide);
  }

  return (
    <aside className="order-ticket">
      <div className="ticket-heading">
        <strong>Place order</strong>
        <span>{asset.base}/{asset.quote} <span className="chevron">⌄</span></span>
      </div>
      <div className="quote-cards">
        <button
          className={`quote-card sell-quote ${selectedSide === "sell" ? "selected" : ""}`}
          type="button"
          aria-pressed={selectedSide === "sell"}
          onClick={() => setSelectedSide("sell")}
        >
          <span>SELL / BID <b>↘</b></span>
          <strong>{formatter.format(asset.bid)}</strong>
        </button>
        <button
          className={`quote-card buy-quote ${selectedSide === "buy" ? "selected" : ""}`}
          type="button"
          aria-pressed={selectedSide === "buy"}
          onClick={() => setSelectedSide("buy")}
        >
          <span>BUY / ASK <b>↗</b></span>
          <strong>{formatter.format(asset.ask)}</strong>
        </button>
      </div>
      <div className="spread-label">Spread {formatter.format(spread)} USD</div>

      <div className="ticket-controls">
        <div className="order-kind-tabs" role="tablist" aria-label="Order type">
          <button
            type="button"
            role="tab"
            aria-selected={orderKind === "market"}
            className={orderKind === "market" ? "active" : ""}
            onClick={() => setOrderKind("market")}
          >
            Market
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={orderKind === "pending"}
            className={orderKind === "pending" ? "active" : ""}
            onClick={() => setOrderKind("pending")}
          >
            Pending
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          {orderKind === "pending" && (
            <label className="order-field">
              <span>Entry price</span>
              <span className="order-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pendingPrice}
                  onChange={(event) => setPendingPrice(event.target.value)}
                />
                <small>USD</small>
              </span>
            </label>
          )}
          <label className="order-field">
            <span>Volume <small>1 lot = {asset.base}</small></span>
            <span className="volume-stepper">
              <button type="button" aria-label="Decrease volume" onClick={() => setVolume((Number(volume) - 0.01).toFixed(2))}>−</button>
              <input
                aria-label="Order volume in lots"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(event.target.value)}
              />
              <small>lots</small>
              <button type="button" aria-label="Increase volume" onClick={() => setVolume((Number(volume) + 0.01).toFixed(2))}>+</button>
            </span>
          </label>
          <div className="volume-presets">
            {volumePresets.map((preset) => (
              <button
                type="button"
                key={preset}
                className={volume === preset ? "active" : ""}
                onClick={() => setVolume(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="risk-fields">
            <label className="risk-toggle">
              <input type="checkbox" checked={takeEnabled} onChange={(event) => setTakeEnabled(event.target.checked)} />
              Take profit
            </label>
            <label className="risk-toggle">
              <input type="checkbox" checked={stopEnabled} onChange={(event) => setStopEnabled(event.target.checked)} />
              Stop loss
            </label>
            {takeEnabled && (
              <span className="order-input-wrap take-profit-input">
                <input
                  aria-label="Take profit price"
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(event) => setTakeProfit(event.target.value)}
                />
                <small>USD</small>
              </span>
            )}
            {stopEnabled && (
              <span className="order-input-wrap stop-loss-input">
                <input
                  aria-label="Stop loss price"
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                />
                <small>USD</small>
              </span>
            )}
          </div>

          <div className="order-estimates">
            <div><span>Order value</span><strong>{orderValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></div>
            <div><span>Est. margin · 1:100</span><strong>{estimatedMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></div>
            <div><span>Available funds</span><strong>{mode === "demo" ? `${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : "Unavailable"}</strong></div>
          </div>

          {error && <p className="order-error" role="alert">{error}</p>}
        </form>
      </div>

      <div className="order-actions">
        <button
          className={`order-submit ${selectedSide}`}
          type="button"
          onClick={() => submit(selectedSide)}
        >
          {orderKind === "pending" ? "Place" : "Confirm"} {selectedSide === "buy" ? "Buy" : "Sell"} {numericVolume.toFixed(2)} lots
        </button>
      </div>
      <p className="execution-note">
        {mode === "demo" ? "Market execution · Prices in USD" : "Real account tools are coming soon."}
      </p>

      <div className="demo-notice">
        <span className="shield-small">◇</span>
        {mode === "demo" ? "Demo account · Virtual funds only" : "Real account · Not available yet"}
      </div>
    </aside>
  );
}
