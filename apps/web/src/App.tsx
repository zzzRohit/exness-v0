import { useEffect, useState } from "react";
import { INITIAL_CLOSED_TRADES, INITIAL_OPEN_POSITIONS } from "./mocks/orders.mock";
import { DEMO_ACCOUNT_BALANCE } from "./mocks/account.mock";
import type { AuthenticatedUser } from "./services/api/auth.service";
import type { Navigate } from "./routes/navigation";
import { HistoryPage } from "./pages/HistoryPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { SigninPage } from "./pages/SigninPage";
import { SignupPage } from "./pages/SignupPage";
import { TradingPage } from "./pages/TradingPage";
import { useMarketData } from "./hooks/useMarketData";
import type { ClosedTrade, OpenPosition, PendingOrder } from "./types/market";

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [demoBalance, setDemoBalance] = useState(DEMO_ACCOUNT_BALANCE);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [mode, setMode] = useState<"demo" | "real">("demo");
  const [positions, setPositions] = useState(INITIAL_OPEN_POSITIONS);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(INITIAL_CLOSED_TRADES);
  const assets = useMarketData();
  const navigate: Navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };
  const authenticateUser = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setMode("demo");
  };

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (path === "/signup") {
    return <SignupPage navigate={navigate} onAuthenticated={authenticateUser} />;
  }
  if (path === "/signin") {
    return <SigninPage navigate={navigate} onAuthenticated={authenticateUser} />;
  }
  if (path === "/portfolio") {
    return (
      <PortfolioPage
        navigate={navigate}
        balance={demoBalance}
        mode={mode}
        positions={positions}
        assets={assets}
      />
    );
  }
  if (path === "/history") {
    return <HistoryPage navigate={navigate} trades={closedTrades} mode={mode} />;
  }

  return (
    <TradingPage
      navigate={navigate}
      balance={demoBalance}
      onBalanceChange={setDemoBalance}
      user={user}
      mode={mode}
      onModeChange={setMode}
      assets={assets}
      positions={positions}
      onPositionsChange={setPositions}
      pendingOrders={pendingOrders}
      onPendingOrdersChange={setPendingOrders}
      closedTrades={closedTrades}
      onClosedTradesChange={setClosedTrades}
    />
  );
}
