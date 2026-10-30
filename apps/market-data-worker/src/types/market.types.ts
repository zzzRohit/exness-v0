export type Asset = "BTC" | "ETH" | "SOL";

export type ExchangeSymbol = "BTCUSDT" | "ETHUSDT" | "SOLUSDT";

export interface BinanceTradeMessage {
  e: "trade";
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

export interface NormalizedTradeInput {
  asset: Asset;
  symbol: ExchangeSymbol;
  price: string;
  quantity: string;
  eventTime: number;
  tradeId: number;
}

export interface LatestMarketPrice {
  asset: Asset;
  price: bigint;
  eventTime: number;
}

export interface PlatformQuote {
  buyPrice: bigint;
  sellPrice: bigint;
}

export type CandleInterval = "1m" | "1d" | "1w";

export interface Candle {
  asset: Asset;
  interval: CandleInterval;
  startTime: number;
  open: bigint;
  high: bigint;
  low: bigint;
  close: bigint;
  tradeCount: number;
}

export interface NormalizedBookTickerInput {
  asset: Asset;
  symbol: ExchangeSymbol;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  updateId: number;
  receivedAt: number;
}
/// make a type of latestAskbidPrice

export interface LatestBookTicker {
  asset: Asset;
  bidPrice: bigint;
  askPrice: bigint;
  bidQuantity: bigint;
  askQuantity: bigint;
  updateId: number;
  receivedAt: number;
}

// and think about Quantity how we should store them ???
//  then updateID is used to track which order is newer and all
