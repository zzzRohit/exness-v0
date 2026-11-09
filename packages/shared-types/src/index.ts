export type OrderSide = "buy" | "sell";

export type Asset = "BTC" | "ETH" | "SOL";

export interface Quote {
  type: "quote";
  asset: string;
  bid: string;
  ask: string;
  timestamp: number;
}

export interface OpenOrderInput {
  type: OrderSide;
  qty: string | number;
  asset: Asset;
  stopLoss?: string | number;
  takeProfit?: string | number;
}
