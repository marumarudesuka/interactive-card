import type { CircuitConfig } from "../types/circuit";

export interface CircuitValidationResult {
  valid: boolean;
  errors: Partial<Record<"id" | "entity" | "name", string>>;
}

export interface CircuitMutationResult {
  circuits: CircuitConfig[];
  changed: boolean;
}

export function validateCircuitConfig(
  circuit: CircuitConfig
): CircuitValidationResult {
  const errors: CircuitValidationResult["errors"] = {};
  if (!circuit.id.trim()) errors.id = "ID required";
  if (!circuit.entity.trim()) errors.entity = "Entity required";
  if (!circuit.name.trim()) errors.name = "Display name required";
  return { valid: Object.keys(errors).length === 0, errors };
}

function normalizeCircuit(
  circuit: CircuitConfig,
  fallbackOrder: number
): CircuitConfig {
  return {
    ...circuit,
    id: circuit.id.trim(),
    entity: circuit.entity.trim(),
    name: circuit.name.trim(),
    icon: circuit.icon?.trim() || "mdi:electric-switch",
    enabled: circuit.enabled ?? true,
    order: circuit.order ?? fallbackOrder,
  };
}

export class CircuitManager {
  create(
    circuits: readonly CircuitConfig[],
    circuit: CircuitConfig
  ): CircuitMutationResult {
    const normalized = normalizeCircuit(circuit, circuits.length);
    const validation = validateCircuitConfig(normalized);
    if (
      !validation.valid ||
      circuits.some((item) => item.id === normalized.id)
    ) {
      return { circuits: [...circuits], changed: false };
    }
    return { circuits: [...circuits, normalized], changed: true };
  }

  update(
    circuits: readonly CircuitConfig[],
    circuit: CircuitConfig
  ): CircuitMutationResult {
    const index = circuits.findIndex((item) => item.id === circuit.id);
    if (index < 0) return this.create(circuits, circuit);

    const normalized = normalizeCircuit(circuit, index);
    if (!validateCircuitConfig(normalized).valid) {
      return { circuits: [...circuits], changed: false };
    }
    const updated = circuits.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...normalized } : { ...item }
    );
    return { circuits: updated, changed: true };
  }

  remove(
    circuits: readonly CircuitConfig[],
    circuitId: string
  ): CircuitMutationResult {
    const updated = circuits.filter((circuit) => circuit.id !== circuitId);
    return {
      circuits: updated,
      changed: updated.length !== circuits.length,
    };
  }

  reorder(
    circuits: readonly CircuitConfig[],
    orderedIds: readonly string[]
  ): CircuitMutationResult {
    const orderById = new Map(
      orderedIds.map((id, index) => [id, index])
    );
    const updated = circuits.map((circuit, index) => ({
      ...circuit,
      order: orderById.get(circuit.id) ?? circuit.order ?? index,
    }));
    return { circuits: updated, changed: true };
  }
}
