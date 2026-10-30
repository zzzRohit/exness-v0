export type OrderSide = "buy" | "sell";

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
  asset: string;
  stopLoss?: string | number;
  takeProfit?: string | number;
}
