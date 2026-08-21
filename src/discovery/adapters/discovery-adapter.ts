import type { DiscoveredMetric, DiscoveryHassLike, DiscoveryStateLike } from "../discovery.types";

export interface DiscoveryAdapterContext {
  hass: DiscoveryHassLike;
  state?: DiscoveryStateLike;
}

export interface DiscoveryAdapter {
  readonly id: string;
  matches(metric: DiscoveredMetric, context: DiscoveryAdapterContext): boolean;
  enhance(metric: DiscoveredMetric, context: DiscoveryAdapterContext): DiscoveredMetric;
}

export function applyDiscoveryAdapters(
  metric: DiscoveredMetric,
  context: DiscoveryAdapterContext,
  adapters: readonly DiscoveryAdapter[]
): DiscoveredMetric {
  return adapters.reduce(
    (current, adapter) => adapter.matches(current, context)
      ? adapter.enhance(current, context)
      : current,
    metric
  );
}
