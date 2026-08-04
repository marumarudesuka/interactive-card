import type { TrendConfigRepository } from "../repositories/trend-config-repository";
import type { EnergyTrendCardConfig } from "../types/trend";
import { normalizeEnergyTrendCardConfig } from "./trend-config-normalizer.ts";

export class TrendConfigCoordinator {
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly repository: TrendConfigRepository;

  constructor(repository: TrendConfigRepository) {
    this.repository = repository;
  }

  async resolve(
    cardId: string,
    yamlConfig: EnergyTrendCardConfig
  ): Promise<EnergyTrendCardConfig> {
    await this.saveQueue;
    const stored = await this.repository.load(cardId);
    if (!stored) return normalizeEnergyTrendCardConfig(yamlConfig);

    return normalizeEnergyTrendCardConfig({
      ...yamlConfig,
      ...stored,
      id: yamlConfig.id ?? stored.id,
      type: yamlConfig.type ?? stored.type,
      entities: stored.entities,
    });
  }

  save(cardId: string, config: EnergyTrendCardConfig): Promise<void> {
    const snapshot = normalizeEnergyTrendCardConfig(config);
    const operation = this.saveQueue.then(() =>
      this.repository.save(cardId, snapshot)
    );
    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }
}
