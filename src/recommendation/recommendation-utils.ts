import type { DiscoveredMetric, SuggestedMetricRole } from "../discovery/discovery.types";
import type { RecommendationMetadata } from "./recommendation.types";

export function viableMetrics(metrics:readonly DiscoveredMetric[]):DiscoveredMetric[] {
  return metrics.filter((metric) => metric.available && metric.numeric);
}

export function rankRecommendations(
  metrics:readonly DiscoveredMetric[],
  preferredRoles:readonly SuggestedMetricRole[] = []
):DiscoveredMetric[] {
  const roles = new Map(preferredRoles.map(
    (role, index) => [role, preferredRoles.length - index]
  ));
  return [...metrics].sort((left, right) => {
    const score = (metric:DiscoveredMetric) =>
      (roles.get(metric.suggestedRole) ?? 0) * 1000 + metric.confidence * 100;
    return score(right) - score(left) ||
      left.name.localeCompare(right.name) ||
      left.entityId.localeCompare(right.entityId);
  });
}

export function recommendationFingerprint(metric:DiscoveredMetric):string {
  const identity = metric.entityId.split(".").pop() ?? metric.entityId;
  const stem = identity.toLowerCase()
    .replace(/(?:power|energy|usage|consumption|total|current|rt|sensor)/g, "")
    .replace(/[_-]?\d+$/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return `${metric.metricType}:${stem || identity.toLowerCase()}`;
}

export function toRecommendationMetadata(
  metric:DiscoveredMetric,
  reasonPrefix:string
):RecommendationMetadata {
  const sourceAdapter = metric.evidence.find(
    (item) => item.source === "adapter" && item.adapter
  )?.adapter;
  const strongestEvidence = [...metric.evidence]
    .sort((left, right) => right.weight - left.weight)[0];
  const evidenceReason = strongestEvidence
    ? `${strongestEvidence.source}: ${strongestEvidence.value}`
    : "classified by the generic discovery pipeline";
  return {
    entityId:metric.entityId,
    displayName:metric.name,
    metricType:metric.metricType,
    suggestedRole:metric.suggestedRole,
    confidence:metric.confidence,
    evidence:metric.evidence.map((item) => ({ ...item })),
    reason:`${reasonPrefix}; ${evidenceReason}`,
    sourceAdapter,
  };
}
