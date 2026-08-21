import type { HomeAssistant } from "custom-card-helpers";

import type { DiscoveredMetric, MetricType } from "../../../discovery/discovery.types";
import { parseNumericEntityState } from "../../../helpers/entity-state-parser.ts";
import { formatMetric } from "../../../helpers/metric-formatter.ts";
import type { TrendSeries } from "../../../types/trend";
import { analyzeCost } from "./analyzers/cost-analyzer.ts";
import { analyzeEnergy } from "./analyzers/energy-analyzer.ts";
import { analyzePower } from "./analyzers/power-analyzer.ts";
import { analyzeSolar } from "./analyzers/solar-analyzer.ts";

export type TrendAnalysisMetricType = MetricType | "solar";

export interface TrendAnalysisFact {
  label: string;
  value: string;
}

export interface TrendAnalysisSummaryItem {
  label: string;
  primary: string;
  secondary?: string;
}

export interface TrendAnalysisEvent {
  timestamp: number;
  time: string;
  label: string;
  detail?: string;
  importance: number;
}

export interface TrendAnalysisResult {
  metricType: TrendAnalysisMetricType;
  facts: TrendAnalysisFact[];
  pattern: string;
  summary?: TrendAnalysisSummaryItem[];
  keyEvents?: TrendAnalysisEvent[];
  insight?: string;
}

export interface TrendAnalyzerInput {
  series: TrendSeries;
  metricType: TrendAnalysisMetricType;
  stateStatus: string;
}

export function formatAnalysisValue(
  series: TrendSeries,
  value: number,
  decimals = series.precision
): string {
  const formatted = formatMetric({
    entityId: series.entity,
    name: series.name,
    status: "valid",
    value,
    unit: series.unit,
  }, {
    autoScale: true,
    decimals,
    trimTrailingZeros: true,
    useGrouping: true,
  });
  return `${formatted.value}${formatted.unit ? ` ${formatted.unit}` : ""}`;
}

export function formatAnalysisTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function resolveAnalysisMetricType(
  metric: DiscoveredMetric | undefined,
  series: TrendSeries
): TrendAnalysisMetricType {
  if (metric?.suggestedRole === "solar_power") return "solar";
  if (metric) return metric.metricType;
  if (series.category === "power" || series.category === "energy" || series.category === "cost") {
    return series.category;
  }
  return "other";
}

export function analyzeTrendSeries(
  hass: HomeAssistant,
  series: TrendSeries,
  metrics: readonly DiscoveredMetric[]
): TrendAnalysisResult {
  const metric = metrics.find((item) => item.entityId === series.entity);
  const metricType = resolveAnalysisMetricType(metric, series);
  const input: TrendAnalyzerInput = {
    series,
    metricType,
    stateStatus: parseNumericEntityState(hass, series.entity).status,
  };

  switch (metricType) {
    case "power": return analyzePower(input);
    case "energy": return analyzeEnergy(input);
    case "cost": return analyzeCost(input);
    case "solar": return analyzeSolar(input);
    default:
      return {
        metricType,
        facts: [
          { label: "Metric type", value: metricType.replace("_", " ") },
          { label: "Data points", value: String(series.points.length) },
          { label: "Entity status", value: input.stateStatus },
        ],
        pattern: series.points.length ? "Basic history is available for this metric." : "No history is available for this period.",
      };
  }
}
