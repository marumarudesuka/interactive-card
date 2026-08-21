import type {
  TrendAxis,
  TrendPoint,
  TrendSeries,
} from "../types/trend";

export interface TrendPlotArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TrendTimeDomain {
  min: number;
  max: number;
}

export function getTrendTimeDomain(
  series: readonly TrendSeries[]
): TrendTimeDomain {
  const timestamps = series.flatMap((item) =>
    item.points.map((point) => point.timestamp)
  );
  const min = timestamps.length ? Math.min(...timestamps) : 0;
  const max = timestamps.length ? Math.max(...timestamps) : min + 1;
  return {
    min,
    max: max === min ? min + 1 : max,
  };
}

export function getTrendX(
  timestamp: number,
  domain: TrendTimeDomain,
  plot: TrendPlotArea
): number {
  return (
    plot.left +
    ((timestamp - domain.min) / (domain.max - domain.min)) * plot.width
  );
}

export function getTrendY(
  value: number,
  axis: TrendAxis,
  plot: TrendPlotArea
): number {
  const range = axis.max - axis.min || 1;
  return (
    plot.top +
    plot.height -
    ((value - axis.min) / range) * plot.height
  );
}

export interface TrendBarGeometry {
  zeroY: number;
  valueY: number;
  top: number;
  bottom: number;
  height: number;
}

/** Resolves a bar against the semantic zero baseline using the axis scale. */
export function getTrendBarGeometry(
  value: number,
  axis: TrendAxis,
  plot: TrendPlotArea
): TrendBarGeometry {
  const zeroY = getTrendY(0, axis, plot);
  const valueY = getTrendY(value, axis, plot);
  return {
    zeroY,
    valueY,
    top: Math.min(zeroY, valueY),
    bottom: Math.max(zeroY, valueY),
    height: Math.abs(valueY - zeroY),
  };
}

export function getTrendZeroBaselineY(
  axis: TrendAxis,
  plot: TrendPlotArea
): number | undefined {
  if (axis.min > 0 || axis.max < 0) return undefined;
  const zeroY = getTrendY(0, axis, plot);
  return Number.isFinite(zeroY) ? zeroY : undefined;
}

export function createTrendSeriesPath(
  series: TrendSeries,
  axis: TrendAxis,
  domain: TrendTimeDomain,
  plot: TrendPlotArea
): string {
  return series.points
    .map((point, index) => {
      const x = getTrendX(point.timestamp, domain, plot);
      const y = getTrendY(point.value, axis, plot);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function findNearestTrendPoint(
  points: readonly TrendPoint[],
  timestamp: number
): TrendPoint | undefined {
  if (!points.length) return undefined;
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].timestamp < timestamp) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return points[0];
  const previous = points[low - 1];
  const next = points[low];
  return timestamp - previous.timestamp <= next.timestamp - timestamp
    ? previous
    : next;
}

export function createTrendHoverTimestampIndex(
  series:readonly TrendSeries[]
):number[] {
  return [...new Set(series.flatMap((item) =>
    item.points.map((point) => point.timestamp).filter(Number.isFinite)
  ))].sort((left,right) => left - right);
}

export function findNearestTrendTimestamp(
  timestamps:readonly number[], timestamp:number
):number | undefined {
  if (!timestamps.length) return undefined;
  let low = 0;
  let high = timestamps.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timestamps[middle] < timestamp) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return timestamps[0];
  const previous = timestamps[low - 1];
  const next = timestamps[low];
  return timestamp - previous <= next - timestamp ? previous : next;
}

export function createLinearTicks(
  min: number,
  max: number,
  count: number
): number[] {
  if (count <= 1) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}
