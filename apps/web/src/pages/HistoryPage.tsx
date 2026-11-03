import type { ClosedTrade } from "../types/market";
import type { Navigate } from "../routes/navigation";
import type { AccountMode } from "../components/accounts/AccountSelector";

interface HistoryPageProps {
  navigate: Navigate;
  trades: ClosedTrade[];
  mode: AccountMode;
}

export function HistoryPage({ navigate, trades, mode }: HistoryPageProps) {
  return (
    <main className="secondary-page">
      <header className="secondary-header">
        <a className="terminal-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>Exness V0</a>
        <nav><button type="button" onClick={() => navigate("/")}>Trading terminal</button><button type="button" onClick={() => navigate("/portfolio")}>Portfolio</button><button type="button" className="active">History</button></nav>
        <button type="button" className="return-terminal" onClick={() => navigate("/")}>← Back to terminal</button>
      </header>
      <section className="secondary-content">
        <span className="page-eyebrow">{mode === "demo" ? "DEMO ACCOUNT" : "REAL ACCOUNT"}</span>
        <h1>Trade history</h1>
        <p className="secondary-description">
          {mode === "demo"
            ? "Closed demo trades only. No real-account transactions are recorded."
            : "Real account trade history is not available yet. No real transactions are shown."}
        </p>
        <div className="secondary-card history-card">
          <div className="secondary-card-heading"><h2>Closed trades</h2><span>{mode === "demo" ? `${trades.length} trades` : "Coming soon"}</span></div>
          {mode === "real" ? (
            <p className="secondary-empty">Real account history will appear when account functionality is connected.</p>
          ) : trades.length === 0 ? <p className="secondary-empty">Closed positions will appear here.</p> : (
            <div className="history-table-wrap">
              <table className="activity-table">
                <thead><tr><th>Instrument</th><th>Direction</th><th>Volume</th><th>Entry</th><th>Close</th><th>Closed</th><th>Profit / loss</th></tr></thead>
                <tbody>{trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{trade.symbol.replace("USDT", "/USD")}</td>
                    <td className={trade.side === "buy" ? "positive" : "negative"}>{trade.side}</td>
                    <td>{trade.volume.toFixed(2)}</td><td>{trade.entryPrice.toFixed(2)}</td><td>{trade.exitPrice.toFixed(2)}</td>
                    <td>{new Date(trade.closedAt).toLocaleString()}</td>
                    <td className={trade.profitLoss >= 0 ? "positive" : "negative"}>{trade.profitLoss >= 0 ? "+" : ""}{trade.profitLoss.toFixed(2)} USD</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
