import type { TrendCurvePoint } from "./trend-curve";

export type TrendSeriesRenderStatus = "drawn" | "skipped" | "error";

export interface TrendSeriesRenderResult {
  status: TrendSeriesRenderStatus;
  error?: unknown;
}

export function isValidTrendPlotSize(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

export function getFiniteTrendGeometry(
  points: readonly TrendCurvePoint[]
): TrendCurvePoint[] {
  return points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  );
}

export function runIsolatedTrendSeriesRender(
  context: Pick<CanvasRenderingContext2D, "save" | "restore">,
  render: () => boolean
): TrendSeriesRenderResult {
  context.save();
  try {
    return render() ? { status: "drawn" } : { status: "skipped" };
  } catch (error) {
    return { status: "error", error };
  } finally {
    context.restore();
  }
}
