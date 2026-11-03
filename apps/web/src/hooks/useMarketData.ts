import { useEffect, useState } from "react";
import { getMockMarketAssets, getSimulatedMarketUpdate } from "../services/market/market.service";
import type { MarketAsset } from "../types/market";

export function useMarketData(): MarketAsset[] {
  const [assets, setAssets] = useState(getMockMarketAssets);

  useEffect(() => {
    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      setAssets((current) => getSimulatedMarketUpdate(current, tick));
    }, 6_000);

    return () => window.clearInterval(interval);
  }, []);

  return assets;
}
