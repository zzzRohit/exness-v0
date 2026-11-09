import { ASSETS } from "../config/assets.js";
import type {
  Asset,
  ExchangeSymbol,
  NormalizedBookTickerInput,
} from "../types/market.types.js";

const BASE_URL = "wss://stream.binance.com:9443/stream";

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

type BookTickerHandler = (quote: NormalizedBookTickerInput) => void;

interface CombinedStreamMessage {
  stream: string;
  data: unknown;
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
    exchangeEventTime: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCombinedStreamMessage(
  value: unknown,
): value is CombinedStreamMessage {
  return isRecord(value) && typeof value.stream === "string" && "data" in value;
}

function parseMessage(
  raw: string,
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

  if (isBookTickerPayload(parsed.data)) {
    const quote = normalizeBookTicker(parsed.data, receivedAt);

    if (quote) {
      onBookTicker(quote);
    }

    return;
  }

  console.warn("Ignoring invalid or unsupported payload");
}

export function getBookTickerStreams(): string {
  return ASSETS.map(({ streamSymbol }) => `${streamSymbol}@bookTicker`).join(
    "/",
  );
}

export function connectToBinance(
  onBookticker: BookTickerHandler,
): () => void {
  const streams = getBookTickerStreams();
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
      parseMessage(String(event.data), onBookticker, receivedAt);
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
