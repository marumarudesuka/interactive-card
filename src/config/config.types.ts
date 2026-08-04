export interface BaseCardConfig {
  type?: string;
  title?: string;
  entity?: string;
  icon?: string;
  [key: string]: unknown;
}

import type { CustomKpiConfig } from "../types/kpi";

export type { CustomKpiConfig, KpiTemplate } from "../types/kpi";

/**
 * Lovelace compatibility name. New KPI management code should use
 * CustomKpiConfig for user-created card instances.
 */
export type KpiCardConfig = CustomKpiConfig;

export interface EnergyKpiSectionConfig extends BaseCardConfig {
  cards: KpiCardConfig[];
}

export interface EntitySelectorFilter {
  domains?: string[];
  deviceClasses?: string[];
  stateClasses?: string[];
  predicate?: (entityId: string) => boolean;
}

export interface ConfigChangedDetail<TConfig extends BaseCardConfig = BaseCardConfig> {
  config: TConfig;
}
