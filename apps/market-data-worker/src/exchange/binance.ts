import { ASSETS } from "../config/assets.js";
import type {
  Asset,
  ExchangeSymbol,
  NormalizedTradeInput,
  NormalizedBookTickerInput,
} from "../types/market.types.js";

const BASE_URL = "wss://stream.binance.com:9443/stream";

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

type TradeHandler = (trade: NormalizedTradeInput) => void;
type BookTickerHandler = (quote: NormalizedBookTickerInput) => void;

interface CombinedStreamMessage {
  stream: string;
  data: unknown;
}

interface BinanceTradePayload {
  e: "trade";
  s: string;
  p: string;
  q: string;
  T: number;
  t: number;
}
interface BinanceBookTickerPayload {
  s: string;
  b: string;
  B: string;
  a: string;
  A: string;
  u: number;
}
function isBookTickerPayload(
  value: unknown,
): value is BinanceBookTickerPayload {
  return (
    isRecord(value) &&
    typeof value.s === "string" &&
    typeof value.b === "string" &&
    typeof value.B === "string" &&
    typeof value.a === "string" &&
    typeof value.A === "string" &&
    typeof value.u === "number" &&
    Number.isSafeInteger(value.u) &&
    value.u >= 0 &&
    /^\d+(?:\.\d+)?$/.test(value.b) &&
    /^\d+(?:\.\d+)?$/.test(value.B) &&
    /^\d+(?:\.\d+)?$/.test(value.a) &&
    /^\d+(?:\.\d+)?$/.test(value.A) &&
    /[1-9]/.test(value.b) &&
    /[1-9]/.test(value.a) &&
    /[1-9]/.test(value.B) &&
    /[1-9]/.test(value.A)
  );
}
function normalizeBookTicker(
  payload: BinanceBookTickerPayload,
  receivedAt: number,
): NormalizedBookTickerInput | null {
  const configuredAsset = ASSETS.find(
    (item) => item.exchangeSymbol === payload.s,
  );

  if (!configuredAsset) {
    console.warn(`Ignoring unsupported book ticker symbol: ${payload.s}`);
    return null;
  }

  return {
    asset: configuredAsset.asset,
    symbol: configuredAsset.exchangeSymbol,
    bidPrice: payload.b,
    bidQuantity: payload.B,
    askPrice: payload.a,
    askQuantity: payload.A,
    updateId: payload.u,
    receivedAt,
  };
}

const assetBySymbol = new Map<ExchangeSymbol, Asset>(
  ASSETS.map(({ asset, exchangeSymbol }) => [exchangeSymbol, asset]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCombinedStreamMessage(
  value: unknown,
): value is CombinedStreamMessage {
  return isRecord(value) && typeof value.stream === "string" && "data" in value;
}

function isTradePayload(value: unknown): value is BinanceTradePayload {
  return (
    isRecord(value) &&
    value.e === "trade" &&
    typeof value.s === "string" &&
    typeof value.p === "string" &&
    typeof value.q === "string" &&
    typeof value.T === "number" &&
    Number.isSafeInteger(value.T) &&
    typeof value.t === "number" &&
    Number.isSafeInteger(value.t)
  );
}

function normalizeTrade(
  payload: BinanceTradePayload,
): NormalizedTradeInput | null {
  const asset = assetBySymbol.get(payload.s as ExchangeSymbol);

  if (!asset) {
    console.warn(`Ignoring unsupported symbol: ${payload.s}`);
    return null;
  }

  if (
    !/^\d+(?:\.\d+)?$/.test(payload.p) ||
    !/^\d+(?:\.\d+)?$/.test(payload.q) ||
    !/[1-9]/.test(payload.p) ||
    !/[1-9]/.test(payload.q)
  ) {
    console.warn("Ignoring invalid trade price or quantity");
    return null;
  }

  const configuredAsset = ASSETS.find(
    (item) => item.exchangeSymbol === payload.s,
  );

  if (!configuredAsset) {
    return null;
  }

  return {
    asset,
    symbol: configuredAsset.exchangeSymbol,
    price: payload.p,
    quantity: payload.q,
    eventTime: payload.T,
    tradeId: payload.t,
  };
}

function parseMessage(
  raw: string,
  onTrade: TradeHandler,
  onBookTicker: BookTickerHandler,
  receivedAt: number,
): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("Ignoring malformed Binance JSON");
    return;
  }

  if (!isCombinedStreamMessage(parsed)) {
    console.warn("Ignoring invalid combined-stream wrapper");
    return;
  }

  if (isRecord(parsed.data) && parsed.data.e === "serverShutdown") {
    console.warn("Binance server shutdown announced");
    return;
  }

  // First, check whether this is a trade event.
  if (isTradePayload(parsed.data)) {
    const trade = normalizeTrade(parsed.data);

    if (trade) {
      onTrade(trade);
    }

    return;
  }

  // Otherwise, check whether this is a book ticker event.
  if (isBookTickerPayload(parsed.data)) {
    const quote = normalizeBookTicker(parsed.data, receivedAt);

    if (quote) {
      onBookTicker(quote);
    }

    return;
  }

  // If neither validator accepts it, ignore the message.
  console.warn("Ignoring invalid or unsupported payload");
}

export function connectToBinance(
  onTrade: TradeHandler,
  onBookticker: BookTickerHandler,
): () => void {
  const streams = ASSETS.flatMap(({ streamSymbol }) => [
    `${streamSymbol}@trade`,
    `${streamSymbol}@bookTicker`,
  ]).join("/");
  const url = `${BASE_URL}?streams=${streams}`;
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAttempt = 0;
  let stopped = false;

  function connect(): void {
    if (stopped) return;

    console.log("Connecting to Binance Spot WebSocket...");

    const currentSocket = new WebSocket(url);
    socket = currentSocket;

    currentSocket.addEventListener("open", () => {
      if (socket !== currentSocket || stopped) return;

      reconnectAttempt = 0;
      console.log("Connected to Binance Spot WebSocket");
      console.log(`Subscribed streams: ${streams}`);
    });

    currentSocket.addEventListener("message", (event) => {
      const receivedAt = Date.now();
      if (socket !== currentSocket || stopped) return;
      console.log(event.data);
      parseMessage(String(event.data), onTrade, onBookticker, receivedAt);
    });

    currentSocket.addEventListener("error", () => {
      console.error("Binance WebSocket error");
    });

    currentSocket.addEventListener("close", (event) => {
      if (socket !== currentSocket) return;

      console.warn(`Binance connection closed: ${event.code} ${event.reason}`);

      socket = undefined;

      if (stopped) return;

      const delay = Math.min(
        RECONNECT_INITIAL_MS * 2 ** reconnectAttempt,
        RECONNECT_MAX_MS,
      );

      reconnectAttempt += 1;

      console.log(`Reconnecting in ${delay}ms...`);

      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return () => {
    stopped = true;

    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
    }

    const currentSocket = socket;
    socket = undefined;

    if (currentSocket && currentSocket.readyState < WebSocket.CLOSING) {
      currentSocket.close(1000, "Worker shutting down");
    }
  };
}
