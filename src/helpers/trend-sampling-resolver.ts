import type {
  TrendCategory,
  TrendPoint,
  TrendRenderMode,
  TrendTimeframe,
} from "../types/trend";

export interface TrendSamplingStrategy {
  intervalMinutes: number;
  maxPoints: number;
  aggregation: "average" | "last" | "minmax";
}

const timeframeIntervals: Record<TrendTimeframe, number> = {
  "1H": 1,
  "24H": 15,
  "7D": 120,
  "30D": 480,
};

const timeframePointLimits: Record<TrendTimeframe, number> = {
  "1H": 60,
  "24H": 96,
  "7D": 84,
  "30D": 90,
};

const highPrecisionIntervals: Record<TrendTimeframe, number> = {
  "1H": 0.25,
  "24H": 1,
  "7D": 15,
  "30D": 60,
};

const highPrecisionPointLimits: Record<TrendTimeframe, number> = {
  "1H": 480,
  "24H": 2_880,
  "7D": 1_344,
  "30D": 1_440,
};

export function resolveTrendSamplingStrategy(
  timeframe: TrendTimeframe,
  category: TrendCategory,
  renderMode: TrendRenderMode = "smooth"
): TrendSamplingStrategy {
  if (renderMode === "high_precision") {
    return {
      intervalMinutes: highPrecisionIntervals[timeframe],
      maxPoints: highPrecisionPointLimits[timeframe],
      aggregation: "minmax",
    };
  }
  return {
    intervalMinutes: timeframeIntervals[timeframe],
    maxPoints: timeframePointLimits[timeframe],
    aggregation:
      category === "energy" || category === "cost" ? "last" : "average",
  };
}

export function getLocalTrendBucketStart(
  timestamp: number,
  intervalMinutes: number
): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const interval = intervalMinutes * 60_000;
  return date.getTime() +
    Math.floor((timestamp - date.getTime()) / interval) * interval;
}

export function sampleTrendPointsByTime(
  points: readonly TrendPoint[],
  timeframe: TrendTimeframe,
  category: TrendCategory,
  renderMode: TrendRenderMode = "smooth"
): TrendPoint[] {
  if (!points.length) return [];
  const strategy = resolveTrendSamplingStrategy(
    timeframe,
    category,
    renderMode
  );
  const buckets = new Map<number, TrendPoint[]>();

  for (const point of points) {
    const bucket = getLocalTrendBucketStart(
      point.timestamp,
      strategy.intervalMinutes
    );
    const bucketPoints = buckets.get(bucket) ?? [];
    bucketPoints.push(point);
    buckets.set(bucket, bucketPoints);
  }

  const sampled = [...buckets.entries()].flatMap(
    ([timestamp, bucketPoints]) => {
      if (strategy.aggregation === "minmax") {
        const min = bucketPoints.reduce((result, point) =>
          point.value < result.value ? point : result
        );
        const max = bucketPoints.reduce((result, point) =>
          point.value > result.value ? point : result
        );
        return min === max
          ? [min]
          : min.timestamp <= max.timestamp ? [min, max] : [max, min];
      }
      return [{
        timestamp,
        value:
          strategy.aggregation === "last"
            ? bucketPoints[bucketPoints.length - 1].value
            : bucketPoints.reduce((sum, point) => sum + point.value, 0) /
              bucketPoints.length,
      }];
    }
  );
  return sampled.slice(-strategy.maxPoints);
}

export class TrendSamplingCache {
  private cache = new WeakMap<
    readonly TrendPoint[],
    Map<string, TrendPoint[]>
  >();

  sample(
    points: readonly TrendPoint[],
    timeframe: TrendTimeframe,
    category: TrendCategory,
    renderMode: TrendRenderMode = "smooth"
  ): TrendPoint[] {
    const key = `${timeframe}:${category}:${renderMode}`;
    const cachedByStrategy = this.cache.get(points);
    const cached = cachedByStrategy?.get(key);
    if (cached) return cached;

    const sampled = sampleTrendPointsByTime(
      points,
      timeframe,
      category,
      renderMode
    );
    const nextCache =
      cachedByStrategy ?? new Map<string, TrendPoint[]>();
    nextCache.set(key, sampled);
    this.cache.set(points, nextCache);
    return sampled;
  }
}
