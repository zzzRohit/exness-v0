import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { CandleTimeframe, MarketCandle } from "../../types/market";

interface CandlestickChartProps {
  symbol: string;
  timeframe: CandleTimeframe;
  bid: number;
  candles: MarketCandle[];
}

export function CandlestickChart({
  symbol,
  timeframe,
  bid,
  candles,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateCurrentCandleRef = useRef<(price: number) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#1a1f26" },
        textColor: "#b0b7c2",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#252b33" },
        horzLines: { color: "#252b33" },
      },
      rightPriceScale: {
        borderColor: "#2b3038",
        scaleMargins: { top: 0.1, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "#2b3038",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
      },
      crosshair: {
        vertLine: { color: "#68717d", labelBackgroundColor: "#2b3038" },
        horzLine: { color: "#68717d", labelBackgroundColor: "#2b3038" },
      },
      localization: {
        priceFormatter: (price: number) =>
          price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#49b494",
      downColor: "#d96f78",
      borderUpColor: "#49b494",
      borderDownColor: "#d96f78",
      wickUpColor: "#49b494",
      wickDownColor: "#d96f78",
      priceLineColor: "#49b494",
      priceLineStyle: 2,
      priceLineWidth: 1,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });

    candleSeries.setData(
      candles.map(({ time, open, high, low, close }) => ({
        time: time as UTCTimestamp,
        open,
        high,
        low,
        close,
      })),
    );
    volumeSeries.setData(
      candles.map(({ time, open, close, volume }) => ({
        time: time as UTCTimestamp,
        value: volume,
        color: close >= open ? "rgba(73, 180, 148, 0.42)" : "rgba(217, 111, 120, 0.42)",
      })),
    );
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const priceLine = candleSeries.createPriceLine({
      price: bid,
      color: "#49b494",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "",
    });
    const lastCandle = candles.at(-1);
    if (lastCandle) {
      let currentCandle = { ...lastCandle };
      updateCurrentCandleRef.current = (currentPrice) => {
        currentCandle = {
          ...currentCandle,
          high: Math.max(currentCandle.high, currentPrice),
          low: Math.min(currentCandle.low, currentPrice),
          close: currentPrice,
        };
        candleSeries.update({
          time: currentCandle.time as UTCTimestamp,
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
        });
        priceLine.applyOptions({ price: currentPrice });
      };
    }
    chart.timeScale().fitContent();

    return () => {
      updateCurrentCandleRef.current = () => {};
      chart.remove();
    };
  }, [candles]);

  useEffect(() => {
    updateCurrentCandleRef.current(bid);
  }, [bid]);

  return <div ref={containerRef} className="candlestick-chart" aria-label={`${symbol} ${timeframe} candlestick chart`} />;
}
