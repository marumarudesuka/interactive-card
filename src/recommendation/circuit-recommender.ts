import type { DiscoveredMetric } from "../discovery/discovery.types";
import type { CircuitRecommendation } from "./recommendation.types";
import {
  rankRecommendations,
  recommendationFingerprint,
  toRecommendationMetadata,
  viableMetrics,
} from "./recommendation-utils.ts";

export function recommendCircuits(
  metrics:readonly DiscoveredMetric[],
  limit = 12
):CircuitRecommendation[] {
  const power = viableMetrics(metrics).filter((metric) => metric.metricType === "power");
  const dedicated = power.filter((metric) => metric.suggestedRole === "circuit_power");
  const nonMain = power.filter((metric) => metric.suggestedRole !== "main_power");
  const pool = dedicated.length
    ? [...dedicated, ...nonMain.filter((metric) => metric.suggestedRole !== "circuit_power")]
    : nonMain.length ? nonMain : power;
  const ranked = rankRecommendations(pool, ["circuit_power"]);
  const fingerprints = new Set<string>();
  const selected = ranked.filter((metric) => {
    const fingerprint = recommendationFingerprint(metric);
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  }).slice(0, limit);
  return selected.map((metric, order) => ({
    order,
    ...toRecommendationMetadata(
      metric,
      metric.suggestedRole === "circuit_power"
        ? "dedicated circuit power role"
        : "compatible power metric; no stronger circuit role available"
    ),
  }));
}
