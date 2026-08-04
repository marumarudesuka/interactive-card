import { convertToBaseUnit } from "./unit-converter.ts";
import type {
  TransformedTrendData,
  TrendAxis,
  TrendCategory,
  TrendEntityConfig,
  TrendEntityMetadata,
  TrendHistoryByEntity,
  TrendPoint,
  TrendSeries,
} from "../types/trend";

function createAxisId(unit: string, family: string): string {
  return family === "other"
    ? `unit:${unit || "unitless"}`
    : `${family}:${unit}`;
}

function createPoints(
  states: TrendHistoryByEntity[string],
  sourceUnit: string
): { points: TrendPoint[]; unit: string; family: string } {
  const points: TrendPoint[] = [];
  let normalizedUnit = sourceUnit;
  let family = "other";

  for (const state of states) {
    const value = Number(state.state);
    const timestamp = Date.parse(
      state.last_changed ?? state.last_updated ?? ""
    );
    if (!Number.isFinite(value) || !Number.isFinite(timestamp)) continue;

    const converted = convertToBaseUnit(value, sourceUnit);
    normalizedUnit = converted.unit;
    family = converted.family;
    points.push({
      timestamp,
      value: converted.value,
    });
  }

  points.sort((left, right) => left.timestamp - right.timestamp);

  return {
    points: points.filter(
      (point, index) =>
        index === 0 ||
        point.timestamp !== points[index - 1].timestamp
    ),
    unit: normalizedUnit,
    family,
  };
}

export function createTrendAxes(
  series: readonly TrendSeries[]
): TrendAxis[] {
  const grouped = new Map<string, TrendSeries[]>();

  for (const item of series) {
    const existing = grouped.get(item.axisId) ?? [];
    existing.push(item);
    grouped.set(item.axisId, existing);
  }

  const entries = [...grouped.entries()];
  const axes: TrendAxis[] = entries.map(([axisId, axisSeries]) => {
    const values = axisSeries.flatMap((item) =>
      item.points.map((point) => point.value)
    );
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 0;

    return {
      id: axisId,
      axisGroup:axisSeries.find((item) => item.axisGroup)?.axisGroup,
      category: axisSeries[0].category,
      unit: axisSeries[0].unit,
      precision: Math.max(
        ...axisSeries.map((item) => item.precision)
      ),
      min: rawMin,
      max: rawMax,
    };
  });
  const assigned = new Set<"left" | "right">();
  const resolved = axes.map((axis, index) => {
    let axisGroup = axis.axisGroup;
    if (!axisGroup || assigned.has(axisGroup)) {
      axisGroup = !assigned.has("left") ? "left" :
        !assigned.has("right") ? "right" : undefined;
    }
    if (axisGroup) assigned.add(axisGroup);
    return { ...axis, axisGroup:index < 2 ? axisGroup : undefined };
  });
  return resolved.sort((left, right) =>
    left.axisGroup === right.axisGroup ? 0 : left.axisGroup === "left" ? -1 : 1
  );
}

export function transformTrendHistory(
  history: TrendHistoryByEntity,
  entities: readonly TrendEntityConfig[],
  defaultCategory: TrendCategory,
  metadata: Readonly<Record<string, TrendEntityMetadata>> = {}
): TransformedTrendData {
  const series: TrendSeries[] = entities.map((config) => {
    const entityMetadata = metadata[config.entity] ?? {};
    const historyUnit = String(
      history[config.entity]?.find(
        (state) => state.attributes?.unit_of_measurement
      )?.attributes?.unit_of_measurement ?? ""
    );
    const sourceUnit =
      entityMetadata.unit ||
      historyUnit ||
      config.unit ||
      "";
    const transformed = createPoints(
      history[config.entity] ?? [],
      sourceUnit
    );

    const axisId = createAxisId(
      transformed.unit,
      transformed.family
    );

    return {
      id: config.entity,
      entity: config.entity,
      name: config.name ?? entityMetadata.name ?? config.entity,
      color: config.color,
      chartMode: config.chartMode ?? "line",
      category: config.category ?? defaultCategory,
      unit: transformed.unit,
      axisId,
      axisGroup:
        config.axis === "left" || config.axis === "right"
          ? config.axis
          : undefined,
      precision: config.decimals ?? 2,
      points: transformed.points,
      visible: config.enabled !== false,
      lineStyle: config.lineStyle ?? "solid",
      renderMode: config.renderMode,
    };
  });

  return {
    series,
    axes: createTrendAxes(series.filter((item) => item.points.length > 0)),
  };
}
