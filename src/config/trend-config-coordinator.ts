import type { TrendConfigRepository } from "../repositories/trend-config-repository";
import type { EnergyTrendCardConfig } from "../types/trend";
import { normalizeEnergyTrendCardConfig } from "./trend-config-normalizer.ts";

export class TrendConfigCoordinator {
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly repository?: TrendConfigRepository;

  constructor(repository?: TrendConfigRepository) {
    this.repository = repository;
  }

  async resolve(
    _cardId: string,
    yamlConfig: EnergyTrendCardConfig
  ): Promise<EnergyTrendCardConfig> {
    // Lovelace/YAML is the only persistent source of truth. Legacy repository
    // snapshots may contain stale series settings and must never participate in
    // runtime config resolution.
    return normalizeEnergyTrendCardConfig(yamlConfig);
  }

  save(cardId: string, config: EnergyTrendCardConfig): Promise<void> {
    const repository = this.repository;
    if (!repository) return Promise.resolve();
    const snapshot = normalizeEnergyTrendCardConfig(config);
    const operation = this.saveQueue.then(() =>
      repository.save(cardId, snapshot)
    );
    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }
}
