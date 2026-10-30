import type {
  Asset,
  LatestMarketPrice,
  LatestBookTicker,
  NormalizedTradeInput,
  NormalizedBookTickerInput,
} from "../types/market.types.js";
import { decimalToScaledBigInt } from "../utils/decimal.js";
const internalState_trade = new Map<Asset, LatestMarketPrice>();
const internalState_BookTicker = new Map<Asset, LatestBookTicker>();

export const updateLatestTradePrice = (trade: NormalizedTradeInput): void => {
  // 1. Retrieve the existing price
  const existingPrice = internalState_trade.get(trade.asset);

  // 2. Skip older events
  if (existingPrice && trade.eventTime < existingPrice.eventTime) {
    return;
  }
  const price = decimalToScaledBigInt(trade.price);

  const latestPrice: LatestMarketPrice = {
    asset: trade.asset,
    price,
    eventTime: trade.eventTime,
  };
  internalState_trade.set(trade.asset, latestPrice);
};

export const getLatestTradePrice = (asset: Asset) => {
  const Latestprice = internalState_trade.get(asset);
  if (!Latestprice) {
    return null;
  }
  return Latestprice;
};

export const updateLatestBookTicker = (
  quote: NormalizedBookTickerInput,
): LatestBookTicker | null => {
  const existingQuote = internalState_BookTicker.get(quote.asset);

  if (existingQuote && quote.updateId < existingQuote.updateId) {
    return null;
  }

  const isValidBookTicker = (bidPrice: bigint, askPrice: bigint): boolean => {
    return bidPrice <= askPrice;
  };
  const bidPrice = decimalToScaledBigInt(quote.bidPrice);
  const askPrice = decimalToScaledBigInt(quote.askPrice);
  if (!isValidBookTicker(bidPrice, askPrice)) {
    return null;
  }

  const askQuantity = decimalToScaledBigInt(quote.askQuantity , 8);
  const bidQuantity = decimalToScaledBigInt(quote.bidQuantity,8);
  const latestQuote: LatestBookTicker = {
    asset: quote.asset,
    bidPrice,
    askPrice,
    bidQuantity,
    askQuantity,
    updateId: quote.updateId,
    receivedAt: quote.receivedAt,
  };
  internalState_BookTicker.set(quote.asset, latestQuote);
  return latestQuote;
};
export const getLatestBookTickerPrice = (
  asset: Asset,
): LatestBookTicker | null => {
  const LatestPrice = internalState_BookTicker.get(asset);
  if (!LatestPrice) {
    return null;
  }
  return LatestPrice;
};
export interface PlatformQuote {
  buyPrice: bigint;
  sellPrice: bigint;
}
export const calculateSpread = (trade : LatestBookTicker):PlatformQuote=>{
  const buyPrice = (trade.askPrice*101n) /100n;
  const sellPrice = (trade.bidPrice*99n) /100n;
  const quote : PlatformQuote = {
    buyPrice ,
    sellPrice
  }
  return quote ;
}