import type { DiscoveredMetric, MetricType, SuggestedMetricRole } from "../discovery/discovery.types";
import type { TrendRecommendation } from "./recommendation.types";
import {
  rankRecommendations,
  recommendationFingerprint,
  toRecommendationMetadata,
  viableMetrics,
} from "./recommendation-utils.ts";

const supported = new Set<MetricType>([
  "power", "energy", "cost", "voltage", "current", "frequency",
  "power_factor", "percentage",
]);
const preferredRoles:readonly SuggestedMetricRole[] = [
  "main_power", "daily_energy", "total_energy", "energy_cost", "solar_power",
];

export function recommendTrendSeries(
  metrics:readonly DiscoveredMetric[],
  limit = 8
):TrendRecommendation[] {
  const viable = viableMetrics(metrics).filter((metric) => supported.has(metric.metricType));
  const ranked = rankRecommendations(viable, preferredRoles);
  const selected:DiscoveredMetric[] = [];
  const entities = new Set<string>();
  const fingerprints = new Set<string>();
  const add = (metric:DiscoveredMetric | undefined) => {
    if (!metric || entities.has(metric.entityId) || selected.length >= limit) return;
    const fingerprint = recommendationFingerprint(metric);
    if (fingerprints.has(fingerprint)) return;
    selected.push(metric);
    entities.add(metric.entityId);
    fingerprints.add(fingerprint);
  };

  for (const role of preferredRoles) {
    add(ranked.find((metric) => metric.suggestedRole === role));
  }
  for (const type of supported) {
    add(ranked.find((metric) => metric.metricType === type));
  }
  for (const metric of ranked) add(metric);

  return selected.map((metric, order) => ({
    order,
    ...toRecommendationMetadata(
      metric,
      preferredRoles.includes(metric.suggestedRole)
        ? `meaningful ${metric.suggestedRole} trend`
        : `high-confidence ${metric.metricType} trend`
    ),
  }));
}
