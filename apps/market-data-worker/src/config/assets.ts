import type { Asset, ExchangeSymbol } from "../types/market.types.js";

export interface AssetConfig {
  asset: Asset;
  exchangeSymbol: ExchangeSymbol;
  streamSymbol: string;
}

export const ASSETS: AssetConfig[] = [
  {
    asset: "BTC",
    exchangeSymbol: "BTCUSDT",
    streamSymbol: "btcusdt",
  },
  {
    asset: "ETH",
    exchangeSymbol: "ETHUSDT",
    streamSymbol: "ethusdt",
  },
  {
    asset: "SOL",
    exchangeSymbol: "SOLUSDT",
    streamSymbol: "solusdt",
  },
];
