import type { DiscoveredMetric, DiscoveryHassLike } from "./discovery.types";
import { createDiscoveredMetric } from "./metric-classifier.ts";

/** Discover numeric or semantically classified metrics without vendor rules. */
export function discoverGenericMetrics(hass: DiscoveryHassLike): DiscoveredMetric[] {
  return Object.entries(hass.states ?? {})
    .map(([entityId, state]) => createDiscoveredMetric(entityId, state))
    .filter((metric) => metric.numeric || metric.metricType !== "other")
    .sort((left, right) => left.entityId.localeCompare(right.entityId));
}
