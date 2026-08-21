import type { DiscoveredMetric, SuggestedMetricRole } from "../discovery.types";
import type { DiscoveryAdapter } from "./discovery-adapter";

function ecoMainText(metric: DiscoveredMetric): string {
  return `${metric.entityId} ${metric.name}`.toLowerCase();
}

export function hasLegacyEcoMainName(metric: DiscoveredMetric): boolean {
  return ecoMainText(metric).includes("ecomain");
}

export function isEcoMainMetricCandidate(metric: DiscoveredMetric): boolean {
  const text = ecoMainText(metric);
  return hasLegacyEcoMainName(metric) ||
    /(?:^|[._\s-])main_(?:all|ch\d+)(?:$|[._\s-])/.test(text);
}

function enhancedRole(metric: DiscoveredMetric): SuggestedMetricRole {
  const text = ecoMainText(metric);
  if (metric.metricType === "power" && text.includes("main_all")) return "main_power";
  if (metric.metricType === "energy" && text.includes("main_all")) return "total_energy";
  if (metric.metricType === "power" && /main_ch\d+/.test(text)) return "circuit_power";
  return metric.suggestedRole;
}

export const ecoMainDiscoveryAdapter: DiscoveryAdapter = {
  id: "ecomain",
  matches: isEcoMainMetricCandidate,
  enhance(metric) {
    return {
      ...metric,
      suggestedRole: enhancedRole(metric),
      confidence: Math.min(0.99, metric.confidence + 0.05),
      evidence: [...metric.evidence, {
        source: "adapter",
        value: "EcoMain naming pattern",
        weight: 0.05,
        adapter: "ecomain",
      }],
    };
  },
};
