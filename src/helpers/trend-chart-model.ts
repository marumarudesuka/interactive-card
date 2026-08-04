import type {
  ResolvedTrendAxis,
  TrendAxis,
  TrendSeries,
  TrendTimeframe,
  TrendRenderMode,
} from "../types/trend";
import { TrendSamplingCache } from "./trend-sampling-resolver.ts";
import { resolveTrendAxes } from "./trend-axis-resolver.ts";
import { createTrendAxes } from "./trend-transformer.ts";

export interface PreparedTrendChartData {
  series: TrendSeries[];
  axes: ResolvedTrendAxis[];
  excludedAxisCount: number;
}

export class TrendChartModelCache {
  private sourceSeries?: readonly TrendSeries[];
  private sourceAxes?: readonly TrendAxis[];
  private hiddenKey = "";
  private timeframe?: TrendTimeframe;
  private renderMode?: TrendRenderMode;
  private samplingCache = new TrendSamplingCache();
  private prepared: PreparedTrendChartData = {
    series: [],
    axes: [],
    excludedAxisCount: 0,
  };

  resolve(
    series: readonly TrendSeries[],
    axes: readonly TrendAxis[],
    hiddenSeries: ReadonlySet<string>,
    timeframe: TrendTimeframe,
    renderMode: TrendRenderMode
  ): PreparedTrendChartData {
    const hiddenKey = [...hiddenSeries].sort().join("\u0000");
    if (
      series === this.sourceSeries &&
      axes === this.sourceAxes &&
      hiddenKey === this.hiddenKey &&
      timeframe === this.timeframe &&
      renderMode === this.renderMode
    ) {
      return this.prepared;
    }

    const visibleSeries = series
      .filter((item) => item.visible && !hiddenSeries.has(item.id))
      .map((item) => ({
        ...item,
        points: this.samplingCache.sample(
          item.points,
          timeframe,
          item.category,
          item.renderMode ?? renderMode
        ),
      }));
    const calculatedAxes = createTrendAxes(visibleSeries);
    const selectedAxes = calculatedAxes.slice(0, 2);
    const selectedAxisIds = new Set(
      selectedAxes.map((axis) => axis.id)
    );
    const drawableSeries = visibleSeries
      .filter((item) => selectedAxisIds.has(item.axisId))
      .map((item) => ({
        ...item,
        axisGroup:selectedAxes.find((axis) => axis.id === item.axisId)
          ?.axisGroup,
      }));
    this.sourceSeries = series;
    this.sourceAxes = axes;
    this.hiddenKey = hiddenKey;
    this.timeframe = timeframe;
    this.renderMode = renderMode;
    this.prepared = {
      series: drawableSeries,
      axes: resolveTrendAxes(
        selectedAxes.length ? selectedAxes : axes.slice(0, 2)
      ),
      excludedAxisCount: Math.max(0, calculatedAxes.length - 2),
    };
    return this.prepared;
  }
}
