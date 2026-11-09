export type Asset = "BTC" | "ETH" | "SOL";

export type ExchangeSymbol = "BTCUSDT" | "ETHUSDT" | "SOLUSDT";

export interface PlatformQuote {
  buyPrice: bigint;
  sellPrice: bigint;
}

export type CandleInterval = "1m" | "5m" | "30m" | "1d" | "1w";

export interface BidAskCandle {
  asset: Asset;
  interval: CandleInterval;
  startTime: number;
  bidOpen: bigint;
  bidHigh: bigint;
  bidLow: bigint;
  bidClose: bigint;
  askOpen: bigint;
  askHigh: bigint;
  askLow: bigint;
  askClose: bigint;
  quoteCount: bigint;
  firstReceivedAt: number;
  firstUpdateId: number;
  lastReceivedAt: number;
  lastUpdateId: number;
}

export interface PersistedMarketQuote {
  ingestId: bigint;
  asset: Asset;
  receivedAt: number;
  updateId: number;
  bidPrice: bigint;
  askPrice: bigint;
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
  exchangeEventTime: number | null;
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
  exchangeEventTime: number | null;
}

// and think about Quantity how we should store them ???
//  then updateID is used to track which order is newer and all
export interface PlatformPrice {
  asset : Asset,
  bidPrice : bigint,
  askPrice : bigint,
  decimal : 6,
  receivedAt : number
}