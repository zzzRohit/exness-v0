import type { MarketAsset, OpenPosition } from "../types/market";
import type { Navigate } from "../routes/navigation";
import type { AccountMode } from "../components/accounts/AccountSelector";

interface PortfolioPageProps {
  navigate: Navigate;
  balance: number;
  mode: AccountMode;
  positions: OpenPosition[];
  assets: MarketAsset[];
}

export function PortfolioPage({ navigate, balance, mode, positions, assets }: PortfolioPageProps) {
  const profit = positions.reduce((total, position) => {
    const asset = assets.find((item) => item.symbol === position.symbol);
    const movement = (asset?.bid ?? position.entryPrice) - position.entryPrice;
    return total + movement * position.volume * (position.side === "buy" ? 1 : -1);
  }, 0);

  return (
    <main className="secondary-page">
      <header className="secondary-header">
        <a className="terminal-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>Exness V0</a>
        <nav><button type="button" onClick={() => navigate("/")}>Trading terminal</button><button type="button" className="active">Portfolio</button><button type="button" onClick={() => navigate("/history")}>History</button></nav>
        <button type="button" className="return-terminal" onClick={() => navigate("/")}>← Back to terminal</button>
      </header>
      <section className="secondary-content">
        <span className="page-eyebrow">ACCOUNT OVERVIEW</span>
        <h1>Portfolio</h1>
        <p className="secondary-description">A clear view of your selected account and demo positions.</p>
        {mode === "real" ? (
          <div className="real-empty-state">
            <span className="real-account-icon">R</span>
            <h2>Real account features are coming soon</h2>
            <p>No real balance or transactions are available yet. Your demo account remains ready to use.</p>
            <button type="button" className="primary-action" onClick={() => navigate("/")}>Return to Demo</button>
          </div>
        ) : (
          <>
            <div className="portfolio-stats">
              <article><span>Demo balance</span><strong>{balance.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong><small>Virtual funds only</small></article>
              <article><span>Floating P/L</span><strong className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{profit.toFixed(2)} USD</strong><small>{positions.length} open positions</small></article>
              <article><span>Available instruments</span><strong>{assets.length}</strong><small>Mock market data</small></article>
            </div>
            <div className="secondary-card">
              <div className="secondary-card-heading"><h2>Open positions</h2><button type="button" onClick={() => navigate("/")}>Manage positions →</button></div>
              {positions.length === 0 ? <p className="secondary-empty">No open positions. Visit the trading terminal to place a demo order.</p> : positions.map((position) => (
                <div className="portfolio-position" key={position.id}>
                  <strong>{position.symbol.replace("USDT", "/USD")}</strong><span className={position.side === "buy" ? "positive" : "negative"}>{position.side.toUpperCase()}</span><span>{position.volume.toFixed(2)} lots</span><span>Entry {position.entryPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
