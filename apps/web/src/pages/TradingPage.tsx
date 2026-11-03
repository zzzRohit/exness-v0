import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AccountSelector, type AccountMode } from "../components/accounts/AccountSelector";
import { CandlestickChart } from "../components/charts/CandlestickChart";
import { OrderTicket } from "../components/trading/OrderTicket";
import { TradingActivity, calculatePositionProfit, type ActivityTab } from "../components/positions/TradingActivity";
import { useCandles } from "../hooks/useCandles";
import type { AuthenticatedUser } from "../services/api/auth.service";
import type { Navigate } from "../routes/navigation";
import type { CandleTimeframe, ClosedTrade, MarketAsset, OpenPosition, PendingOrder, TradeSide } from "../types/market";

interface TradingPageProps {
  navigate: Navigate;
  balance: number;
  onBalanceChange: Dispatch<SetStateAction<number>>;
  user: AuthenticatedUser | null;
  mode: AccountMode;
  onModeChange: (mode: AccountMode) => void;
  assets: MarketAsset[];
  positions: OpenPosition[];
  onPositionsChange: Dispatch<SetStateAction<OpenPosition[]>>;
  pendingOrders: PendingOrder[];
  onPendingOrdersChange: Dispatch<SetStateAction<PendingOrder[]>>;
  closedTrades: ClosedTrade[];
  onClosedTradesChange: Dispatch<SetStateAction<ClosedTrade[]>>;
}

const topSymbols = ["BTCUSDT", "ETHUSDT", "USOIL", "XAUUSD"];
const timeframeOptions: CandleTimeframe[] = ["1m", "5m", "15m", "30m", "1h", "1d"];

function price(value: number, precision = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function iconLabel(label: string, title: string) {
  return <button type="button" className="tool-button" title={title} aria-label={title}>{label}</button>;
}

export function TradingPage({
  navigate,
  balance,
  onBalanceChange,
  user,
  mode: accountMode,
  onModeChange: setAccountMode,
  assets,
  positions,
  onPositionsChange: setPositions,
  pendingOrders,
  onPendingOrdersChange: setPendingOrders,
  closedTrades,
  onClosedTradesChange: setClosedTrades,
}: TradingPageProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<CandleTimeframe>("5m");
  const [activityTab, setActivityTab] = useState<ActivityTab>("open");
  const [filter, setFilter] = useState<"favorites" | "crypto" | "forex">("favorites");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [toastKey, setToastKey] = useState(0);

  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0];
  const candles = useCandles(selectedSymbol, timeframe);
  const visibleAssets = useMemo(() => assets.filter((asset) => {
    const matchesSearch = `${asset.symbol} ${asset.name}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "favorites" ||
      (filter === "crypto" && asset.category === "crypto") ||
      (filter === "forex" && asset.category === "forex");
    return matchesSearch && matchesFilter;
  }), [assets, filter, search]);
  const totalProfit = positions.reduce((sum, position) => {
    const marketAsset = assets.find((asset) => asset.symbol === position.symbol);
    return sum + calculatePositionProfit(position, marketAsset?.bid ?? position.entryPrice);
  }, 0);

  function showToast(message: string) {
    setToast(message);
    setToastKey((current) => current + 1);
    window.setTimeout(() => setToast(""), 3_600);
  }

  function placeMarketOrder(
    side: TradeSide,
    volume: number,
    stopLoss?: number,
    takeProfit?: number,
  ) {
    if (!selectedAsset || accountMode !== "demo") {
      showToast("Switch to your Demo account to place a simulated order.");
      return;
    }

    const entryPrice = side === "buy" ? selectedAsset.ask : selectedAsset.bid;
    const position: OpenPosition = {
      id: String(Date.now()).slice(-6),
      symbol: selectedAsset.symbol,
      side,
      volume,
      entryPrice,
      ...(stopLoss ? { stopLoss } : {}),
      ...(takeProfit ? { takeProfit } : {}),
      openedAt: Date.now(),
    };
    setPositions((current) => [position, ...current]);
    setActivityTab("open");
  }

  function placePendingOrder(order: Omit<PendingOrder, "id" | "createdAt">) {
    setPendingOrders((current) => [
      { ...order, id: String(Date.now()).slice(-6), createdAt: Date.now() },
      ...current,
    ]);
    setActivityTab("pending");
  }

  function closePosition(position: OpenPosition) {
    const currentPrice = assets.find((asset) => asset.symbol === position.symbol)?.bid ?? position.entryPrice;
    const profitLoss = calculatePositionProfit(position, currentPrice);
    setPositions((current) => current.filter((item) => item.id !== position.id));
    setClosedTrades((current) => [
      {
        ...position,
        closedAt: Date.now(),
        exitPrice: currentPrice,
        profitLoss,
      },
      ...current,
    ]);
    onBalanceChange((currentBalance) => currentBalance + profitLoss);
    showToast(`Demo position closed. Realized P/L: ${profitLoss >= 0 ? "+" : ""}${price(profitLoss)} USD.`);
  }

  function removePendingOrder(orderId: string) {
    setPendingOrders((current) => current.filter((order) => order.id !== orderId));
    showToast("Pending order canceled.");
  }

  if (!selectedAsset) return <div className="loading-state">Loading mock market data…</div>;

  const selectedTopAsset = topSymbols
    .map((symbol) => assets.find((asset) => asset.symbol === symbol))
    .filter((asset) => asset !== undefined);

  return (
    <main className="terminal-shell">
      <header className="terminal-topbar">
        <a className="terminal-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
          Exness V0
        </a>
        <div className="top-market-tabs" aria-label="Favorite instruments">
          {selectedTopAsset.map((asset) => (
            <button
              type="button"
              key={asset.symbol}
              className={`top-market-tab ${selectedSymbol === asset.symbol ? "active" : ""}`}
              onClick={() => setSelectedSymbol(asset.symbol)}
            >
              <span>{asset.base === "XAU" ? "XAU/USD" : asset.base}</span>
              <small className={asset.changePercent >= 0 ? "positive" : "negative"}>
                {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
              </small>
            </button>
          ))}
        </div>
        <div className="topbar-spacer" />
        <div className="header-balance">
          <span>Account balance</span>
          <strong>{accountMode === "demo" ? `${price(balance)} USD` : "Not available"}</strong>
        </div>
        <AccountSelector
          mode={accountMode}
          balance={balance}
          onChange={setAccountMode}
          navigate={navigate}
        />
        <button className="deposit-button" type="button" onClick={() => showToast(accountMode === "demo" ? "Demo funds are virtual. Deposits are not available." : "Real account funding is coming later.")}>
          <b>＋</b> Deposit
        </button>
        <button className="top-icon-button" type="button" aria-label="Notifications" onClick={() => showToast("You’re all caught up.")}>♧</button>
        <button className="top-icon-button" type="button" aria-label="Settings" onClick={() => showToast("Settings are not available in this demo.")}>⚙</button>
        <button className="profile-button" type="button" aria-label={user ? `Signed in as ${user.email}` : "Guest profile"}>
          {user ? user.email.charAt(0).toUpperCase() : "AK"}
        </button>
      </header>

      <section className="terminal-workspace">
        <aside className="watchlist-panel">
          <div className="watchlist-heading">
            <strong>Instruments</strong>
            <button type="button" className="icon-button" aria-label="Watchlist filters" onClick={() => showToast("Watchlist filters are coming soon.")}>☷</button>
          </div>
          <label className="instrument-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search instruments"
              aria-label="Search instruments"
            />
            <kbd>/</kbd>
          </label>
          <div className="watchlist-filters">
            {(["favorites", "crypto", "forex"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {value === "favorites" ? "☆ Favorites" : value === "crypto" ? "Crypto" : "Forex"}
              </button>
            ))}
            <button type="button" className="filter-more" aria-label="More categories" onClick={() => setFilter("favorites")}>⌄</button>
          </div>
          <div className="watchlist-columns"><span>Symbol / 24h</span><span>Bid</span><span>Ask</span></div>
          <div className="watchlist-rows">
            {visibleAssets.map((asset) => (
              <button
                type="button"
                className={`watchlist-row ${selectedSymbol === asset.symbol ? "selected" : ""}`}
                key={asset.symbol}
                onClick={() => setSelectedSymbol(asset.symbol)}
              >
                <span className="watch-symbol">
                  <strong>{asset.base}{asset.category === "crypto" ? "" : `/${asset.quote}`}</strong>
                  <small>{asset.name}{asset.category === "crypto" ? " / US Dollar" : ""}</small>
                </span>
                <span className="watch-bid">{price(asset.bid, asset.precision)}</span>
                <span className="watch-ask">{price(asset.ask, asset.precision)}</span>
                <small className={`watch-change ${asset.changePercent >= 0 ? "positive" : "negative"}`}>
                  {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
                </small>
              </button>
            ))}
            {visibleAssets.length === 0 && <div className="watchlist-empty">No instruments found.</div>}
          </div>
          <div className="watchlist-footer"><span>{visibleAssets.length} instruments</span><button type="button" aria-label="Add instrument" onClick={() => showToast("All available mock instruments are listed.")}>＋</button></div>
        </aside>

        <section className="chart-panel">
          <div className="chart-market-header">
            <div className="chart-asset-name">
              <span className="asset-symbol-mark">{selectedAsset.base.slice(0, 1)}</span>
              <div><strong>{selectedAsset.base} / {selectedAsset.quote}</strong><small>{selectedAsset.name} · CFD</small></div>
              <button type="button" className="quiet-icon" aria-label="Select chart asset" onClick={() => document.querySelector<HTMLInputElement>(".instrument-search input")?.focus()}>⌄</button>
            </div>
            <div className="chart-price-summary">
              <strong>{price(selectedAsset.bid, selectedAsset.precision)}</strong>
              <small className={selectedAsset.changePercent >= 0 ? "positive" : "negative"}>
                {selectedAsset.changePercent >= 0 ? "+" : ""}{price(Math.abs(selectedAsset.bid * selectedAsset.changePercent / 100))} ({selectedAsset.changePercent >= 0 ? "+" : ""}{selectedAsset.changePercent.toFixed(2)}%)
              </small>
            </div>
            <div className="market-high-low">
              <span>24h high <strong>{price(selectedAsset.bid * 1.012, selectedAsset.precision)}</strong></span>
              <span>24h low <strong>{price(selectedAsset.bid * 0.987, selectedAsset.precision)}</strong></span>
            </div>
          </div>
          <div className="chart-controls">
            <div className="timeframe-selectors" role="tablist" aria-label="Chart timeframe">
              {timeframeOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  role="tab"
                  aria-selected={timeframe === option}
                  className={timeframe === option ? "active" : ""}
                  onClick={() => setTimeframe(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="chart-tool-controls">
              {iconLabel("◫", "Candlestick chart")}
              {iconLabel("⌁", "Indicators")}
              <button type="button" className="volume-toggle active" onClick={() => showToast("Volume is displayed below the chart.")}>Volume</button>
              {iconLabel("▧", "Chart snapshot")}
              {iconLabel("☷", "Chart settings")}
              {iconLabel("⛶", "Fullscreen chart")}
            </div>
          </div>
          <div className="chart-and-drawings">
            <div className="drawing-toolbar" aria-label="Chart drawing tools">
              {iconLabel("⊕", "Crosshair")}
              {iconLabel("⌁", "Trend line")}
              {iconLabel("☷", "Chart settings")}
              {iconLabel("／", "Draw line")}
              {iconLabel("T", "Add text")}
              {iconLabel("◇", "Measure")}
              {iconLabel("⌁", "Magnet")}
              {iconLabel("▣", "Lock drawings")}
              {iconLabel("◉", "Show drawings")}
              {iconLabel("▤", "Clear drawings")}
            </div>
            <div className="chart-canvas">
              <div className="ohlc-label">
                O {price(candles.at(-1)?.open ?? selectedAsset.bid, selectedAsset.precision)} &nbsp;
                H {price(Math.max(candles.at(-1)?.high ?? selectedAsset.bid, selectedAsset.bid), selectedAsset.precision)} &nbsp;
                L {price(Math.min(candles.at(-1)?.low ?? selectedAsset.bid, selectedAsset.bid), selectedAsset.precision)} &nbsp;
                C {price(selectedAsset.bid, selectedAsset.precision)}
              </div>
              <CandlestickChart
                key={`${selectedSymbol}-${timeframe}`}
                symbol={selectedSymbol}
                timeframe={timeframe}
                bid={selectedAsset.bid}
                candles={candles}
              />
            </div>
          </div>
          <div className="chart-footer">
            <div>{["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "All"].map((range) => (
              <button type="button" key={range} onClick={() => showToast(`${range} range selected.`)}>{range}</button>
            ))}</div>
            <span>14:59:42 (UTC) &nbsp;&nbsp; log &nbsp;&nbsp; auto</span>
          </div>
          <TradingActivity
            activeTab={activityTab}
            onTabChange={setActivityTab}
            positions={positions}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            assets={assets}
            balance={balance}
            onClosePosition={closePosition}
            onCancelPending={removePendingOrder}
          />
        </section>

        <OrderTicket
          key={selectedAsset.symbol}
          asset={selectedAsset}
          mode={accountMode}
          balance={balance}
          onMarketOrder={placeMarketOrder}
          onPendingOrder={placePendingOrder}
          onToast={showToast}
        />

        {accountMode === "real" && (
          <div className="real-account-banner" role="status">
            <span className="real-account-icon">R</span>
            <div>
              <strong>Real account features are coming soon</strong>
              <small>Demo mode remains fully available. No real balance or trades are shown here.</small>
            </div>
            <button type="button" onClick={() => setAccountMode("demo")}>Switch to Demo</button>
          </div>
        )}
      </section>

      <footer className="terminal-statusbar">
        <span>● &nbsp; Demo environment · Market snapshot &nbsp; 30 Oct 2026</span>
        <span>Trading involves risk. &nbsp;&nbsp; Keyboard shortcuts &nbsp;&nbsp; Help center</span>
      </footer>

      {toast && (
        <div className="toast-message" role="status" key={toastKey}>
          <span>✓</span>{toast}
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}>×</button>
        </div>
      )}
    </main>
  );
}
