export type MetricType =
  | "power"
  | "energy"
  | "cost"
  | "voltage"
  | "current"
  | "frequency"
  | "power_factor"
  | "percentage"
  | "other";

export type SuggestedMetricRole =
  | "main_power"
  | "total_energy"
  | "daily_energy"
  | "solar_power"
  | "circuit_power"
  | "energy_cost"
  | "voltage"
  | "current"
  | "frequency"
  | "power_factor"
  | "percentage"
  | "unknown";

export type DiscoveryEvidenceSource =
  | "device_class"
  | "unit_of_measurement"
  | "state_class"
  | "entity_metadata"
  | "entity_id"
  | "friendly_name"
  | "adapter"
  | "fallback";

export interface DiscoveryEvidence {
  source: DiscoveryEvidenceSource;
  value: string;
  weight: number;
  adapter?: string;
}

export interface DiscoveredMetric {
  entityId: string;
  name: string;
  metricType: MetricType;
  unit: string;
  normalizedUnit: string;
  deviceClass?: string;
  stateClass?: string;
  suggestedRole: SuggestedMetricRole;
  confidence: number;
  available: boolean;
  numeric: boolean;
  evidence: DiscoveryEvidence[];
}

export interface DiscoveryStateLike {
  state: string;
  attributes?: Readonly<Record<string, unknown>>;
}

export interface DiscoveryHassLike {
  states: Readonly<Record<string, DiscoveryStateLike>>;
}
