import type {
  EnergyTrendCardConfig,
  TrendCategory,
  TrendChartMode,
  TrendCurveMode,
  TrendEntityConfig,
  TrendRenderMode,
  TrendTimeframe,
} from "../types/trend";

const timeframes: readonly TrendTimeframe[] = [
  "1H",
  "24H",
  "7D",
  "30D",
];

const categories: readonly TrendCategory[] = [
  "power",
  "energy",
  "cost",
  "circuit",
];
const curves: readonly TrendCurveMode[] = ["smooth", "raw", "step"];
const renderModes: readonly TrendRenderMode[] = [
  "smooth",
  "high_precision",
];
const chartModes: readonly TrendChartMode[] = ["line", "area", "bar"];

function normalizeEntity(
  entity: TrendEntityConfig,
  index: number,
  fallbackChartMode: TrendChartMode
): TrendEntityConfig | undefined {
  const entityId = entity.entity?.trim();
  if (!entityId) return undefined;

  return {
    entity: entityId,
    order:
      typeof entity.order === "number" && Number.isFinite(entity.order)
        ? Math.max(0, Math.trunc(entity.order))
        : index,
    chartMode: chartModes.includes(entity.chartMode as TrendChartMode)
      ? entity.chartMode
      : fallbackChartMode,
    name: entity.name?.trim() || undefined,
    color: entity.color?.trim() || undefined,
    category: categories.includes(entity.category as TrendCategory)
      ? entity.category
      : undefined,
    unit: entity.unit?.trim() || undefined,
    enabled: entity.enabled !== false,
    decimals:
      typeof entity.decimals === "number" &&
      Number.isFinite(entity.decimals)
        ? Math.max(0, Math.min(4, Math.trunc(entity.decimals)))
        : 2,
    autoScale: entity.autoScale !== false,
    lineStyle: entity.lineStyle === "dashed" ? "dashed" : "solid",
    renderMode: renderModes.includes(entity.renderMode as TrendRenderMode)
      ? entity.renderMode
      : undefined,
    axis:
      entity.axis === "left" || entity.axis === "right"
        ? entity.axis
        : "auto",
  };
}

export function normalizeEnergyTrendCardConfig(
  config: Partial<EnergyTrendCardConfig>
): EnergyTrendCardConfig {
  const fallbackChartMode = chartModes.includes(config.chartMode as TrendChartMode)
    ? config.chartMode as TrendChartMode
    : "line";
  const timeframe = timeframes.includes(config.timeframe as TrendTimeframe)
    ? config.timeframe
    : "24H";
  const category = categories.includes(config.category as TrendCategory)
    ? config.category
    : "energy";
  const height =
    typeof config.height === "number" && Number.isFinite(config.height)
      ? Math.max(240, config.height)
      : 350;

  return {
    id: config.id?.trim() || undefined,
    type: config.type,
    title: config.title?.trim() || "Energy Trend",
    height,
    curve: curves.includes(config.curve as TrendCurveMode)
      ? config.curve
      : "smooth",
    renderMode: renderModes.includes(config.renderMode as TrendRenderMode)
      ? config.renderMode
      : "smooth",
    fullWidth: config.fullWidth !== false,
    timeframe,
    category,
    entities: Array.isArray(config.entities)
      ? config.entities
          .map((entity, index) => normalizeEntity(
            entity,
            index,
            fallbackChartMode
          ))
          .filter((entity): entity is TrendEntityConfig => Boolean(entity))
          .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
          .map((entity, index) => ({ ...entity, order: index }))
      : [],
  };
}
