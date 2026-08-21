import type {
  ResolvedTrendAxis,
  TrendTimeframe,
} from "../types/trend";
import { formatValue } from "./value-formatter.ts";

const trendColors = [
  "var(--en-color-series-1, #444D9E)",
  "var(--en-color-series-2, #FBB03B)",
  "var(--en-color-series-3, #8CC34B)",
  "var(--en-color-series-4, #6971B1)",
  "var(--en-color-series-5, #FCC063)",
  "var(--en-color-series-6, #A3CF6F)",
];

const trendColorFallbacks = [
  "#444D9E", "#FBB03B", "#8CC34B", "#6971B1", "#FCC063", "#A3CF6F",
];

function getTrendPaletteIndex(index:number, seriesId?:string):number {
  if (!seriesId) return Math.abs(index) % trendColors.length;
  let hash = 0;
  for (let position = 0; position < seriesId.length; position++) {
    hash = ((hash << 5) - hash + seriesId.charCodeAt(position)) | 0;
  }
  return Math.abs(hash) % trendColors.length;
}

export function getTrendSeriesFallbackColor(index:number, seriesId?:string):string {
  return trendColorFallbacks[getTrendPaletteIndex(index,seriesId)];
}

export function getTrendSeriesColor(
  configuredColor: string | undefined,
  index: number,
  seriesId?: string
): string {
  const explicitColor = configuredColor?.trim();
  if (explicitColor) return explicitColor;
  return trendColors[getTrendPaletteIndex(index,seriesId)];
}

export interface TrendValueFormatOptions {
  includeUnit?: boolean;
  decimals?: number;
}

export function formatTrendValue(
  value: number,
  axis: ResolvedTrendAxis,
  options: TrendValueFormatOptions = {}
): string {
  const formatted = formatValue(
    value / axis.displayScale,
    axis.displayUnit,
    {
      autoScale: false,
      decimals: options.decimals ?? axis.precision,
      useGrouping: true,
    }
  );
  return options.includeUnit === false || !formatted.unit
    ? formatted.value
    : `${formatted.value} ${formatted.unit}`;
}

export function formatTrendAxisValue(
  value: number,
  axis: ResolvedTrendAxis
): string {
  return formatTrendValue(value, axis, {
    includeUnit: false,
    decimals: axis.precision,
  });
}

export function formatTrendSeriesValue(
  value: number,
  axis: ResolvedTrendAxis,
  precision = axis.precision
): string {
  return formatTrendValue(value, axis, { decimals: precision });
}

export function formatTrendTime(
  timestamp: number,
  timeframe: TrendTimeframe
): string {
  const options: Intl.DateTimeFormatOptions =
    timeframe === "1H" || timeframe === "24H"
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(undefined, options).format(timestamp);
}
