import type { CircuitConfig } from "../types/circuit";
import type { CircuitConfigRepository } from "../config/repositories/circuit-config-repository";

interface CircuitStorageEnvelope {
  version: 1;
  circuits: CircuitConfig[];
}

const DEFAULT_STORAGE_KEY = "interactive-card:circuit-config:v1";

function cloneCircuits(circuits: readonly CircuitConfig[]): CircuitConfig[] {
  return circuits.map((circuit) => ({ ...circuit }));
}

function isCircuitConfig(value: unknown): value is CircuitConfig {
  if (!value || typeof value !== "object") return false;
  const circuit = value as Partial<CircuitConfig>;
  return Boolean(
    typeof circuit.id === "string" &&
    typeof circuit.entity === "string" &&
    typeof circuit.name === "string"
  );
}

export class LocalStorageCircuitConfigRepository
  implements CircuitConfigRepository {
  private readonly storageKey: string;

  constructor(storageKey = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  async load(): Promise<CircuitConfig[] | undefined> {
    const raw = globalThis.localStorage?.getItem(this.storageKey);
    if (!raw) return undefined;

    try {
      const envelope = JSON.parse(raw) as Partial<CircuitStorageEnvelope>;
      if (envelope.version !== 1 || !Array.isArray(envelope.circuits)) {
        return undefined;
      }
      return envelope.circuits
        .filter(isCircuitConfig)
        .map((circuit, index) => ({
          ...circuit,
          enabled: circuit.enabled ?? true,
          order: circuit.order ?? index,
        }));
    } catch {
      return undefined;
    }
  }

  async save(circuits: readonly CircuitConfig[]): Promise<void> {
    const envelope: CircuitStorageEnvelope = {
      version: 1,
      circuits: cloneCircuits(circuits),
    };
    globalThis.localStorage?.setItem(
      this.storageKey,
      JSON.stringify(envelope)
    );
  }

  async update(circuit: CircuitConfig): Promise<void> {
    const circuits = (await this.load()) ?? [];
    const updated = circuits.some((item) => item.id === circuit.id)
      ? circuits.map((item) =>
          item.id === circuit.id ? { ...item, ...circuit } : item
        )
      : [...circuits, { ...circuit }];
    await this.save(updated);
  }

  async remove(circuitId: string): Promise<void> {
    const circuits = (await this.load()) ?? [];
    await this.save(
      circuits.filter((circuit) => circuit.id !== circuitId)
    );
  }
}
