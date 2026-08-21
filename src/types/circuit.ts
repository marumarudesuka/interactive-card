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
  /** Optional stable identity used to scope browser-local pending Circuits. */
  id?: string;
  title?: string;
  /** Shared height, in pixels, for every Circuit card in this section. */
  cardHeight?: number;
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
