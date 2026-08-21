import type { TrendChartLayout } from "./trend-chart-layout";

export function areTrendChartLayoutsEqual(
  current: TrendChartLayout | undefined,
  next: TrendChartLayout
): boolean {
  return Boolean(current) &&
    current?.width === next.width &&
    current.height === next.height &&
    current.plot.left === next.plot.left &&
    current.plot.top === next.plot.top &&
    current.plot.right === next.plot.right &&
    current.plot.bottom === next.plot.bottom &&
    current.plot.width === next.plot.width &&
    current.plot.height === next.plot.height;
}
