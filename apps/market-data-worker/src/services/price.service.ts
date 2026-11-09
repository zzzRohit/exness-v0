import type {
  Asset,
  LatestBookTicker,
  NormalizedBookTickerInput,
} from "../types/market.types.js";
import {
  decimalToScaledBigInt,
  PRICE_DECIMAL_PLACES,
  QUANTITY_DECIMAL_PLACES,
} from "../utils/decimal.js";
const internalState_BookTicker = new Map<Asset, LatestBookTicker>();

export const updateLatestBookTicker = (
  quote: NormalizedBookTickerInput,
): LatestBookTicker | null => {
  const existingQuote = internalState_BookTicker.get(quote.asset);

  if (existingQuote && quote.updateId <= existingQuote.updateId) {
    return null;
  }

  const isValidBookTicker = (bidPrice: bigint, askPrice: bigint): boolean => {
    return bidPrice <= askPrice;
  };
  const bidPrice = decimalToScaledBigInt(
    quote.bidPrice,
    PRICE_DECIMAL_PLACES,
    `${quote.asset} bidPrice`,
  );
  const askPrice = decimalToScaledBigInt(
    quote.askPrice,
    PRICE_DECIMAL_PLACES,
    `${quote.asset} askPrice`,
  );
  if (!isValidBookTicker(bidPrice, askPrice)) {
    return null;
  }

  const askQuantity = decimalToScaledBigInt(
    quote.askQuantity,
    QUANTITY_DECIMAL_PLACES,
    `${quote.asset} askQuantity`,
  );
  const bidQuantity = decimalToScaledBigInt(
    quote.bidQuantity,
    QUANTITY_DECIMAL_PLACES,
    `${quote.asset} bidQuantity`,
  );
  const latestQuote: LatestBookTicker = {
    asset: quote.asset,
    bidPrice,
    askPrice,
    bidQuantity,
    askQuantity,
    updateId: quote.updateId,
    receivedAt: quote.receivedAt,
    exchangeEventTime: quote.exchangeEventTime,
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
