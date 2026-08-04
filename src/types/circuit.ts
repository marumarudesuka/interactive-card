import type { EntityStateStatus } from "./entity-state";

export interface CircuitConfig {
  id: string;
  name: string;
  entity: string;
  icon?: string;
  category?: string;
  enabled: boolean;
  order: number;
}

export type CircuitConfigInput =
  Omit<CircuitConfig, "enabled" | "order"> &
  Partial<Pick<CircuitConfig, "enabled" | "order">>;

export interface CircuitTemplate extends CircuitConfigInput {
  id: string;
  name: string;
  entity: string;
}

export interface EnergyCircuitSectionConfig {
  type?: string;
  title?: string;
  circuits?: CircuitConfigInput[];
}

export interface ResolvedCircuit {
  config: CircuitConfig;
  power: number | null;
  value: string;
  unit: string;
  stateStatus: EntityStateStatus;
  active: boolean;
}
