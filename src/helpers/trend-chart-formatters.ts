import type {
  ResolvedTrendAxis,
  TrendTimeframe,
} from "../types/trend";
import { formatValue } from "./value-formatter.ts";

const trendColors = [
  "var(--en-color-series-1)",
  "var(--en-color-series-2)",
  "var(--en-color-series-3)",
  "var(--en-color-series-4)",
  "var(--en-color-series-5)",
  "var(--en-color-series-6)",
];

export function getTrendSeriesColor(
  _configuredColor: string | undefined,
  index: number
): string {
  // Series colors are a brand-system concern. Keep the configured color
  // parameter for stored/YAML schema compatibility, but never allow a legacy
  // per-series literal to bypass the shared palette.
  return trendColors[index % trendColors.length];
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
