import type { ReactNode } from "react";
import { FigmaIcon } from "../ui/FigmaIcon";
import type { Navigate } from "../../routes/navigation";

interface AuthPageShellProps {
  mode: "signup" | "signin";
  navigate: Navigate;
  children: ReactNode;
}

const showcaseQuotes = [
  { symbol: "ETH", bid: "2,486.20", ask: "2,487.40", change: "+1.26%" },
  { symbol: "XAU/USD", bid: "2,742.35", ask: "2,742.65", change: "+0.68%" },
];

function MiniMarketPreview() {
  const candles = [
    [35, 92, 82, 100, 74],
    [47, 82, 73, 91, 67],
    [59, 73, 81, 88, 65],
    [71, 81, 69, 88, 61],
    [83, 69, 60, 76, 52],
    [95, 60, 67, 74, 54],
    [107, 67, 52, 73, 47],
    [119, 52, 58, 65, 45],
    [131, 58, 46, 65, 40],
    [143, 46, 53, 62, 39],
    [155, 53, 39, 59, 34],
    [167, 39, 44, 52, 30],
    [179, 44, 31, 51, 26],
    [191, 31, 39, 46, 22],
    [203, 39, 28, 44, 19],
    [215, 28, 33, 40, 18],
    [227, 33, 24, 39, 15],
    [239, 24, 31, 38, 13],
    [251, 31, 21, 38, 10],
    [263, 21, 27, 35, 9],
    [275, 27, 17, 33, 7],
    [287, 17, 25, 32, 5],
    [299, 25, 15, 35, 7],
    [311, 15, 23, 31, 5],
    [323, 23, 18, 30, 8],
  ];

  return (
    <div className="market-preview">
      <div className="preview-quote">
        <div className="coin-mark">₿</div>
        <div className="preview-pair">
          <strong>BTC / USD</strong>
          <span>Bitcoin · CFD</span>
        </div>
        <div className="preview-price">
          <strong>67,432.50</strong>
          <span>+1,218.36 (+1.84%)</span>
        </div>
      </div>
      <div className="preview-timeframes">
        <span>1m</span>
        <strong>5m</strong>
        <span>15m</span>
        <span>1h</span>
        <span>4h</span>
      </div>
      <svg
        className="preview-chart"
        viewBox="0 0 360 128"
        role="img"
        aria-label="Mock Bitcoin market chart"
      >
        {[22, 52, 82, 112].map((y) => (
          <line key={`h${y}`} x1="0" x2="360" y1={y} y2={y} />
        ))}
        {[0, 60, 120, 180, 240, 300, 360].map((x) => (
          <line key={`v${x}`} x1={x} x2={x} y1="0" y2="128" />
        ))}
        <polyline
          className="preview-trend"
          points="0,102 22,92 44,97 66,75 88,82 110,64 132,70 154,49 176,57 198,45 220,50 242,31 264,39 286,23 308,29 330,16 350,22"
        />
        {candles.map(([x, open, close, high, low], index) => {
          const rising = close < open;
          return (
            <g key={x} className={rising ? "candle-up" : "candle-down"}>
              <line x1={x} x2={x} y1={high} y2={low} />
              <rect
                x={x - 2}
                y={Math.min(open, close)}
                width="4"
                height={Math.max(3, Math.abs(open - close))}
              />
              <rect
                className="preview-volume"
                x={x - 2}
                y={112 + ((index * 7) % 12)}
                width="4"
                height={16 - ((index * 7) % 12)}
              />
            </g>
          );
        })}
      </svg>
      <div className="preview-watchlist">
        {showcaseQuotes.map((quote) => (
          <div className="preview-watch-row" key={quote.symbol}>
            <div>
              <strong>{quote.symbol}</strong>
              <span>{quote.symbol === "ETH" ? "Ethereum / US Dollar" : "Gold / US Dollar"}</span>
            </div>
            <div>
              <strong>{quote.bid}</strong>
              <span>{quote.ask}</span>
            </div>
            <em>{quote.change}</em>
          </div>
        ))}
      </div>
      <div className="preview-features">
        <div>
          <FigmaIcon name="ChartNoAxesCombined" screen="signup" />
          <span>
            <strong>Advanced charting</strong>
            <small>A clearer market view</small>
          </span>
        </div>
        <div>
          <FigmaIcon name="ListFilter" screen="signup" />
          <span>
            <strong>Your watchlists</strong>
            <small>Keep markets in focus</small>
          </span>
        </div>
        <div>
          <FigmaIcon name="ShieldCheck" screen="signup" />
          <span>
            <strong>Demo environment</strong>
            <small>Practice with virtual funds</small>
          </span>
        </div>
      </div>
    </div>
  );
}

export function AuthPageShell({
  mode,
  navigate,
  children,
}: AuthPageShellProps) {
  const isSignup = mode === "signup";

  return (
    <div className={`auth-shell auth-${mode}`}>
      <header className="auth-topbar">
        <a
          className="auth-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
          }}
        >
          <strong>Exness V0</strong>
          <span />
          <small>Trading terminal</small>
        </a>
        <nav className="auth-top-actions" aria-label="Help and account">
          <button className="language-button" type="button">
            <FigmaIcon name="Globe" screen={mode} />
            English
            <FigmaIcon name="ChevronDown" screen={mode} />
          </button>
          <a href="#help" onClick={(event) => event.preventDefault()}>
            Help center
          </a>
          <button
            className="auth-switch-button"
            type="button"
            onClick={() => navigate(isSignup ? "/signin" : "/signup")}
          >
            {isSignup ? "Sign in" : "Create account"}
            <FigmaIcon name="ArrowUpRight" screen={mode} />
          </button>
        </nav>
      </header>

      <main className="auth-main">
        <section className="auth-showcase">
          <div className="showcase-copy">
            <span className="eyebrow">
              <FigmaIcon name={isSignup ? "ChartNoAxesCombined" : "ChartCandlestick"} screen={mode} />
              {isSignup ? "YOUR MARKETS. YOUR WORKSPACE." : "PICK UP WHERE YOU LEFT OFF."}
            </span>
            <h1>
              {isSignup ? (
                <>
                  Your next move
                  <br />
                  starts here.
                </>
              ) : (
                <>
                  Back to the markets.
                  <br />
                  Back in control.
                </>
              )}
            </h1>
            <p>
              {isSignup
                ? "One account for your trading workspace. Follow the markets, build your watchlist, and practice with virtual funds."
                : "Your charts, watchlists, and trading workspace — ready when you are. Sign in to pick up where you left off."}
            </p>
          </div>
          <MiniMarketPreview />
        </section>

        <section className="auth-form-panel">{children}</section>
      </main>

      <footer className="auth-footer">
        <span>Trading involves risk. You may lose your invested capital.</span>
        <div>
          <a href="#terms" onClick={(event) => event.preventDefault()}>Terms of service</a>
          <a href="#privacy" onClick={(event) => event.preventDefault()}>Privacy policy</a>
        </div>
        <small>• &nbsp; Secure connection · Exness V0</small>
        <small>© 2026 Exness V0. All rights reserved.</small>
      </footer>
    </div>
  );
}
