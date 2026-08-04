import type { CustomKpiConfig } from "../types/kpi";

export interface KpiConfigRepository {
  load(): Promise<CustomKpiConfig[]>;
  save(cards: readonly CustomKpiConfig[]): Promise<void>;
}
