import type { HomeAssistant } from "custom-card-helpers";

import { parseNumericEntityState } from "./entity-state-parser.ts";
import { formatMetric } from "./metric-formatter.ts";
import { convertToBaseUnit } from "./unit-converter.ts";
import type { CircuitConfig, ResolvedCircuit } from "../types/circuit";

export const CIRCUIT_ACTIVE_POWER_THRESHOLD_W = 1;

export function resolveCircuit(
  hass: HomeAssistant | undefined,
  config: CircuitConfig
): ResolvedCircuit {
  const state = parseNumericEntityState(hass, config.entity);
  const basePower = state.status === "valid" && state.value !== null
    ? convertToBaseUnit(state.value, state.unit)
    : null;
  const isPower = basePower?.family === "power";
  const power = isPower ? basePower.value : state.value;
  const displayState = isPower && basePower
    ? {
        ...state,
        value: basePower.value,
        unit: "W",
      }
    : state;
  const metric = formatMetric(displayState, {
    autoScale: true,
    decimals:
      isPower && power !== null && Math.abs(power) < 1_000
        ? 0
        : 2,
  });

  return {
    config,
    power,
    value: metric.value,
    unit: metric.unit,
    stateStatus: metric.status,
    active:
      metric.status === "valid" &&
      power !== null &&
      power > CIRCUIT_ACTIVE_POWER_THRESHOLD_W,
  };
}

export function sortCircuitsByPower(
  circuits: readonly ResolvedCircuit[]
): ResolvedCircuit[] {
  return [...circuits].sort((left, right) => {
    const leftPower = left.power ?? Number.NEGATIVE_INFINITY;
    const rightPower = right.power ?? Number.NEGATIVE_INFINITY;
    return rightPower - leftPower;
  });
}

export function sortCircuitsByOrder(
  circuits: readonly ResolvedCircuit[]
): ResolvedCircuit[] {
  return circuits
    .map((circuit, index) => ({ circuit, index }))
    .sort((left, right) => {
      const orderDifference =
        left.circuit.config.order - right.circuit.config.order;
      return orderDifference || left.index - right.index;
    })
    .map(({ circuit }) => circuit);
}

export function resolveActiveCircuits(
  hass: HomeAssistant | undefined,
  configs: readonly CircuitConfig[]
): ResolvedCircuit[] {
  return sortCircuitsByOrder(
    configs
      .filter((config) => config.enabled)
      .map((config) => resolveCircuit(hass, config))
  );
}
