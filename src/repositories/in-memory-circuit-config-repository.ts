import type { CircuitConfig } from "../types/circuit";
import type { CircuitConfigRepository } from "../config/repositories/circuit-config-repository";

function cloneCircuits(circuits: readonly CircuitConfig[]): CircuitConfig[] {
  return circuits.map((circuit) => ({ ...circuit }));
}

export class InMemoryCircuitConfigRepository
  implements CircuitConfigRepository {
  private circuits?: CircuitConfig[];

  constructor(initialCircuits?: readonly CircuitConfig[]) {
    this.circuits = initialCircuits
      ? cloneCircuits(initialCircuits)
      : undefined;
  }

  async load(): Promise<CircuitConfig[] | undefined> {
    return this.circuits
      ? cloneCircuits(this.circuits)
      : undefined;
  }

  async save(circuits: readonly CircuitConfig[]): Promise<void> {
    this.circuits = cloneCircuits(circuits);
  }

  async update(circuit: CircuitConfig): Promise<void> {
    const circuits = this.circuits ?? [];
    this.circuits = circuits.some((item) => item.id === circuit.id)
      ? circuits.map((item) =>
          item.id === circuit.id ? { ...item, ...circuit } : item
        )
      : [...circuits, { ...circuit }];
  }

  async remove(circuitId: string): Promise<void> {
    this.circuits = (this.circuits ?? []).filter(
      (circuit) => circuit.id !== circuitId
    );
  }
}
