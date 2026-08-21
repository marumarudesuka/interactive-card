import type { DiscoveredMetric, MetricType, SuggestedMetricRole } from "../discovery/discovery.types";
import type { KpiRecommendation, KpiRecommendationKind } from "./recommendation.types";
import { rankRecommendations, toRecommendationMetadata, viableMetrics } from "./recommendation-utils.ts";

interface KpiRule {
  kind:KpiRecommendationKind;
  title:string;
  metricType:MetricType;
  roles:readonly SuggestedMetricRole[];
  fallback?:(metric:DiscoveredMetric) => boolean;
}

const rules:readonly KpiRule[] = [
  { kind:"current_power", title:"Current Power", metricType:"power", roles:["main_power"] },
  {
    kind:"daily_energy", title:"Today's Usage", metricType:"energy",
    roles:["daily_energy"],
    fallback:(metric) => metric.suggestedRole !== "total_energy",
  },
  { kind:"total_energy", title:"Total Usage", metricType:"energy", roles:["total_energy"] },
  { kind:"cost", title:"Cost", metricType:"cost", roles:["energy_cost"] },
  { kind:"solar", title:"Solar", metricType:"power", roles:["solar_power"],
    fallback:(metric) => metric.suggestedRole === "solar_power" },
];

export function recommendKpis(metrics:readonly DiscoveredMetric[]):KpiRecommendation[] {
  const viable = viableMetrics(metrics);
  const used = new Set<string>();
  return rules.flatMap((rule) => {
    const typed = viable.filter(
      (metric) => metric.metricType === rule.metricType && !used.has(metric.entityId)
    );
    const roleMatches = typed.filter((metric) => rule.roles.includes(metric.suggestedRole));
    const fallback = rule.fallback ? typed.filter(rule.fallback) : typed;
    const metric = rankRecommendations(
      roleMatches.length ? roleMatches : fallback,
      rule.roles
    )[0];
    if (!metric) return [];
    used.add(metric.entityId);
    return [{
      kind:rule.kind,
      title:rule.title,
      ...toRecommendationMetadata(
        metric,
        rule.roles.includes(metric.suggestedRole)
          ? `preferred ${metric.suggestedRole} role`
          : `best available ${rule.metricType} metric`
      ),
    }];
  });
}
