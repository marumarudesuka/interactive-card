import type { CircuitConfigRepository } from "./repositories/circuit-config-repository";
import type { CircuitConfig } from "../types/circuit";
import { CircuitManager } from "../managers/circuit-manager.ts";

export class CircuitConfigCoordinator {
  private readonly repository: CircuitConfigRepository;
  private readonly manager = new CircuitManager();

  constructor(
    repository: CircuitConfigRepository
  ) {
    this.repository = repository;
  }

  async resolve(
    defaults: readonly CircuitConfig[]
  ): Promise<CircuitConfig[]> {
    const userCircuits = await this.repository.load();
    return userCircuits === undefined
      ? defaults.map((circuit) => ({ ...circuit }))
      : userCircuits.map((circuit) => ({ ...circuit }));
  }

  async update(
    defaults: readonly CircuitConfig[],
    circuit: CircuitConfig
  ): Promise<CircuitConfig[]> {
    const current = await this.resolve(defaults);
    const result = current.some((item) => item.id === circuit.id)
      ? this.manager.update(current, circuit)
      : this.manager.create(current, circuit);
    if (result.changed) await this.repository.save(result.circuits);
    return result.circuits;
  }

  async remove(
    defaults: readonly CircuitConfig[],
    circuitId: string
  ): Promise<CircuitConfig[]> {
    const current = await this.resolve(defaults);
    const result = this.manager.remove(current, circuitId);
    if (result.changed) await this.repository.save(result.circuits);
    return result.circuits;
  }

  async reorder(
    defaults: readonly CircuitConfig[],
    orderedIds: readonly string[]
  ): Promise<CircuitConfig[]> {
    const current = await this.resolve(defaults);
    const result = this.manager.reorder(current, orderedIds);
    if (result.changed) await this.repository.save(result.circuits);
    return result.circuits;
  }
}
