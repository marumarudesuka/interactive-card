import type { CircuitConfig } from "../../types/circuit";

export interface CircuitConfigRepository {
  load(): Promise<CircuitConfig[] | undefined>;
  save(circuits: readonly CircuitConfig[]): Promise<void>;
  update(circuit: CircuitConfig): Promise<void>;
  remove(circuitId: string): Promise<void>;
}
