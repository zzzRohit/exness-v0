import type { ClosedTrade, MarketAsset, OpenPosition, PendingOrder, TradeSide } from "../../types/market";

export type ActivityTab = "open" | "pending" | "closed";

interface TradingActivityProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  positions: OpenPosition[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  assets: MarketAsset[];
  balance: number;
  onClosePosition: (position: OpenPosition) => void;
  onCancelPending: (orderId: string) => void;
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getProfit(position: OpenPosition, currentPrice: number): number {
  const direction = position.side === "buy" ? 1 : -1;
  return (currentPrice - position.entryPrice) * position.volume * direction;
}

export function TradingActivity({
  activeTab,
  onTabChange,
  positions,
  pendingOrders,
  closedTrades,
  assets,
  balance,
  onClosePosition,
  onCancelPending,
}: TradingActivityProps) {
  const totalProfit = positions.reduce((sum, position) => {
    const asset = assets.find((item) => item.symbol === position.symbol);
    return sum + getProfit(position, asset?.bid ?? position.entryPrice);
  }, 0);
  const equity = balance + totalProfit;
  const usedMargin = positions.reduce((sum, position) => {
    const asset = assets.find((item) => item.symbol === position.symbol);
    const unitsPerLot = asset?.category === "crypto" ? 1 : 100;
    return sum + position.volume * position.entryPrice * unitsPerLot / 100;
  }, 0);

  return (
    <section className="trading-activity">
      <div className="activity-header">
        <div className="activity-tabs" role="tablist" aria-label="Trading activity">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "open"}
            className={activeTab === "open" ? "active" : ""}
            onClick={() => onTabChange("open")}
          >
            Open positions <small>{positions.length}</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => onTabChange("pending")}
          >
            Pending orders <small>{pendingOrders.length}</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "closed"}
            className={activeTab === "closed" ? "active" : ""}
            onClick={() => onTabChange("closed")}
          >
            Closed trades <small>{closedTrades.length}</small>
          </button>
        </div>
        <div className="activity-summary">
          <span>Total P/L (USD)</span>
          <strong className={totalProfit >= 0 ? "positive" : "negative"}>
            {totalProfit >= 0 ? "+" : ""}{formatPrice(totalProfit)}
          </strong>
          {activeTab === "open" && positions.length > 0 && (
            <button
              type="button"
              className="close-all-button"
              onClick={() => positions.forEach(onClosePosition)}
            >
              Close all <span>×</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "open" && (
        <div className="table-scroll">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Instrument</th><th>Direction</th><th>Volume (lots)</th><th>Entry price</th>
                <th>Current price</th><th>Stop loss</th><th>Take profit</th><th>Profit / loss (USD)</th><th />
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const asset = assets.find((item) => item.symbol === position.symbol);
                const currentPrice = asset?.bid ?? position.entryPrice;
                const profit = getProfit(position, currentPrice);
                return (
                  <tr key={position.id}>
                    <td><strong>{position.symbol.replace("USDT", "/USD")}</strong><small> #{position.id}</small></td>
                    <td className={position.side === "buy" ? "positive" : "negative"}>
                      {position.side === "buy" ? "↗ Buy" : "↘ Sell"}
                    </td>
                    <td>{position.volume.toFixed(2)}</td>
                    <td>{formatPrice(position.entryPrice)}</td>
                    <td>{formatPrice(currentPrice)}</td>
                    <td>{position.stopLoss ? formatPrice(position.stopLoss) : "—"}</td>
                    <td>{position.takeProfit ? formatPrice(position.takeProfit) : "—"}</td>
                    <td className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{formatPrice(profit)}</td>
                    <td><button className="row-action" type="button" onClick={() => onClosePosition(position)}>Close <span>×</span></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {positions.length === 0 && <div className="empty-table">No open positions yet. Use a demo order to get started.</div>}
        </div>
      )}

      {activeTab === "pending" && (
        <div className="table-scroll">
          <table className="activity-table">
            <thead><tr><th>Instrument</th><th>Direction</th><th>Volume (lots)</th><th>Entry price</th><th>Created</th><th /></tr></thead>
            <tbody>
              {pendingOrders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.symbol.replace("USDT", "/USD")}</strong><small> #{order.id}</small></td>
                  <td className={order.side === "buy" ? "positive" : "negative"}>{order.side === "buy" ? "↗ Buy" : "↘ Sell"}</td>
                  <td>{order.volume.toFixed(2)}</td>
                  <td>{formatPrice(order.entryPrice)}</td>
                  <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                  <td><button className="row-action" type="button" onClick={() => onCancelPending(order.id)}>Cancel <span>×</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingOrders.length === 0 && <div className="empty-table">No pending orders.</div>}
        </div>
      )}

      {activeTab === "closed" && (
        <div className="table-scroll">
          <table className="activity-table">
            <thead><tr><th>Instrument</th><th>Direction</th><th>Volume (lots)</th><th>Entry price</th><th>Close price</th><th>Closed</th><th>Profit / loss (USD)</th></tr></thead>
            <tbody>
              {closedTrades.map((trade) => (
                <tr key={trade.id}>
                  <td><strong>{trade.symbol.replace("USDT", "/USD")}</strong><small> #{trade.id}</small></td>
                  <td className={trade.side === "buy" ? "positive" : "negative"}>{trade.side === "buy" ? "↗ Buy" : "↘ Sell"}</td>
                  <td>{trade.volume.toFixed(2)}</td>
                  <td>{formatPrice(trade.entryPrice)}</td>
                  <td>{formatPrice(trade.exitPrice)}</td>
                  <td>{new Date(trade.closedAt).toLocaleDateString()}</td>
                  <td className={trade.profitLoss >= 0 ? "positive" : "negative"}>{trade.profitLoss >= 0 ? "+" : ""}{formatPrice(trade.profitLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {closedTrades.length === 0 && <div className="empty-table">Closed demo trades will appear here.</div>}
        </div>
      )}

      <div className="account-strip">
        <span>Balance <strong>{formatPrice(balance)}</strong></span>
        <span>Equity <strong>{formatPrice(equity)}</strong></span>
        <span>Used margin <strong>{formatPrice(usedMargin)}</strong></span>
        <span>Free margin <strong>{formatPrice(equity - usedMargin)}</strong></span>
        <small>All values in USD</small>
      </div>
    </section>
  );
}

export function calculatePositionProfit(
  position: OpenPosition,
  currentPrice: number,
): number {
  const direction: Record<TradeSide, number> = { buy: 1, sell: -1 };
  return (currentPrice - position.entryPrice) * position.volume * direction[position.side];
}
