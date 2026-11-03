import { MOCK_MARKET_ASSETS } from "../../mocks/market.mock";
import type { MarketAsset } from "../../types/market";

export function getMockMarketAssets(): MarketAsset[] {
  return MOCK_MARKET_ASSETS.map((asset) => ({ ...asset }));
}

export function getSimulatedMarketUpdate(
  assets: MarketAsset[],
  tick: number,
): MarketAsset[] {
  return assets.map((asset, index) => {
    const movement = Math.sin((tick + index * 3) / 2) * asset.bid * 0.000035;
    const bid = Math.max(0, asset.bid + movement);
    return {
      ...asset,
      bid,
      ask: bid + (asset.ask - asset.bid),
    };
  });
}
