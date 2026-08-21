import type { DiscoveredMetric, DiscoveryHassLike } from "./discovery.types";
import { discoverGenericMetrics } from "./generic-entity-discovery.ts";
import { applyDiscoveryAdapters, type DiscoveryAdapter } from "./adapters/discovery-adapter.ts";

export interface DiscoveryPipelineOptions {
  adapters?: readonly DiscoveryAdapter[];
}

export function discoverMetrics(
  hass: DiscoveryHassLike,
  options: DiscoveryPipelineOptions = {}
): DiscoveredMetric[] {
  const adapters = options.adapters ?? [];
  return discoverGenericMetrics(hass).map((metric) =>
    applyDiscoveryAdapters(metric, { hass, state: hass.states[metric.entityId] }, adapters)
  );
}
