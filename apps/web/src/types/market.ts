export type MarketCategory = "crypto" | "forex" | "commodities";

export interface MarketAsset {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  category: MarketCategory;
  bid: number;
  ask: number;
  changePercent: number;
  volume24h: number;
  precision: number;
}

export type CandleTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TradeSide = "buy" | "sell";

export interface OpenPosition {
  id: string;
  symbol: string;
  side: TradeSide;
  volume: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: TradeSide;
  volume: number;
  entryPrice: number;
  createdAt: number;
}

export interface ClosedTrade extends OpenPosition {
  closedAt: number;
  exitPrice: number;
  profitLoss: number;
}
