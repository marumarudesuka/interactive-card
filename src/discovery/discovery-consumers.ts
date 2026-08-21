import type { DiscoveryHassLike, DiscoveredMetric, MetricType, SuggestedMetricRole } from "./discovery.types";
import { discoverMetrics } from "./discovery-pipeline.ts";
import { ecoMainDiscoveryAdapter } from "./adapters/ecomain-adapter.ts";

const TREND_METRIC_TYPES = new Set<MetricType>([
  "power", "energy", "cost", "voltage", "current", "frequency",
  "power_factor", "percentage",
]);

export function discoverEnergyMetrics(hass: DiscoveryHassLike): DiscoveredMetric[] {
  return discoverMetrics(hass, { adapters: [ecoMainDiscoveryAdapter] });
}

function rankMetrics(
  metrics: readonly DiscoveredMetric[],
  configuredEntity: string | undefined,
  preferredRoles: readonly SuggestedMetricRole[] = []
): DiscoveredMetric[] {
  const roleRank = new Map(preferredRoles.map((role, index) => [role, preferredRoles.length - index]));
  return [...metrics].sort((left, right) => {
    const score = (metric: DiscoveredMetric) =>
      Number(metric.entityId === configuredEntity) * 10_000 +
      (roleRank.get(metric.suggestedRole) ?? 0) * 1_000 +
      metric.confidence * 100 +
      Number(metric.available) * 10 +
      Number(metric.numeric) * 5;
    return score(right) - score(left) || left.name.localeCompare(right.name) ||
      left.entityId.localeCompare(right.entityId);
  });
}

export function getCircuitDiscoveryCandidates(
  metrics: readonly DiscoveredMetric[],
  configuredEntity?: string
): DiscoveredMetric[] {
  return rankMetrics(
    metrics.filter((metric) => metric.metricType === "power"),
    configuredEntity,
    ["circuit_power"]
  );
}

export function getTrendDiscoveryCandidates(
  metrics: readonly DiscoveredMetric[],
  configuredEntity?: string
): DiscoveredMetric[] {
  return rankMetrics(
    metrics.filter((metric) => TREND_METRIC_TYPES.has(metric.metricType)),
    configuredEntity
  );
}

export interface KpiDiscoveryPreference {
  metricTypes: readonly MetricType[];
  roles?: readonly SuggestedMetricRole[];
}

const KPI_PREFERENCES: Readonly<Record<string, KpiDiscoveryPreference>> = {
  total_usage: { metricTypes:["energy"], roles:["total_energy"] },
  usage: { metricTypes:["energy"], roles:["daily_energy", "total_energy"] },
  power: { metricTypes:["power"], roles:["main_power", "circuit_power"] },
  solar_generation: { metricTypes:["power"], roles:["solar_power"] },
  cost: { metricTypes:["cost"], roles:["energy_cost"] },
  monthly_cost: { metricTypes:["cost"], roles:["energy_cost"] },
  peak_power: { metricTypes:["power"], roles:["main_power", "circuit_power"] },
  solar_self_consumption: { metricTypes:["percentage"], roles:["percentage"] },
  renewable_ratio: { metricTypes:["percentage"], roles:["percentage"] },
  grid_import: { metricTypes:["energy"], roles:["total_energy"] },
  grid_export: { metricTypes:["energy"], roles:["total_energy"] },
};

export function getKpiDiscoveryCandidates(
  metrics: readonly DiscoveredMetric[],
  templateId: string,
  configuredEntity?: string
): DiscoveredMetric[] {
  const preference = KPI_PREFERENCES[templateId];
  if (!preference) return [];
  return rankMetrics(
    metrics.filter((metric) => preference.metricTypes.includes(metric.metricType)),
    configuredEntity,
    preference.roles
  );
}

export function createKpiDiscoveryResults(
  metrics: readonly DiscoveredMetric[],
  templates: readonly { id: string }[]
): Readonly<Record<string, readonly DiscoveredMetric[]>> {
  return Object.fromEntries(
    templates.map((template) => [
      template.id,
      getKpiDiscoveryCandidates(metrics, template.id),
    ])
  );
}
