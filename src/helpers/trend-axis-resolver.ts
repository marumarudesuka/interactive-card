import type {
  ResolvedTrendAxis,
  TrendAxis,
} from "../types/trend";
import { resolveTrendAxisUnit } from "./trend-axis-unit-resolver.ts";

const MAX_AXIS_INTERVALS = 6;

function resolveNiceStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor =
    normalized <= 1 ? 1 :
    normalized <= 2 ? 2 :
    normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function resolveTrendAxis(axis: TrendAxis): ResolvedTrendAxis {
  const display = resolveTrendAxisUnit(
    axis.category,
    axis.unit,
    axis.min,
    axis.max
  );
  let displayMin = axis.min / display.scale;
  let displayMax = axis.max / display.scale;
  if (displayMin >= 0) displayMin = 0;
  if (displayMax <= 0) displayMax = 0;
  if (displayMin === displayMax) displayMax += display.tickStep;
  const rawRange = Math.abs(displayMax - displayMin);
  const tickStep = Math.max(
    display.tickStep,
    resolveNiceStep(rawRange / MAX_AXIS_INTERVALS)
  );
  const niceMin =
    Math.floor(displayMin / tickStep) * tickStep;
  const niceMax =
    Math.ceil(displayMax / tickStep) * tickStep;
  const tickCount = Math.round(
    (niceMax - niceMin) / tickStep
  );
  const displayTicks = Array.from(
    { length: tickCount + 1 },
    (_, index) => niceMin + index * tickStep
  );

  return {
    ...axis,
    min: niceMin * display.scale,
    max: niceMax * display.scale,
    displayUnit: display.displayUnit,
    displayScale: display.scale,
    tickStep,
    ticks: displayTicks.map((displayValue) => ({
      value: displayValue * display.scale,
      displayValue,
    })),
  };
}

export function resolveTrendAxes(
  axes: readonly TrendAxis[]
): ResolvedTrendAxis[] {
  return axes.map(resolveTrendAxis);
}
