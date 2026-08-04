import type { EnergyTrendCardConfig } from "../types/trend";

export interface TrendConfigRepository {
  load(cardId: string): Promise<EnergyTrendCardConfig | undefined>;
  save(cardId: string, config: EnergyTrendCardConfig): Promise<void>;
}
