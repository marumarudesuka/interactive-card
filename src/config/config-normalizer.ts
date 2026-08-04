import type {
  EnergyKpiSectionConfig,
  KpiCardConfig,
} from "./config.types";

export function normalizeKpiCardConfig(config: KpiCardConfig): KpiCardConfig {
  return {
    autoScale: true,
    decimals: 2,
    ...config,
    history: Array.isArray(config.history) ? [...config.history] : undefined,
  };
}

export function normalizeEnergyKpiSectionConfig(
  config: Partial<EnergyKpiSectionConfig>
): EnergyKpiSectionConfig {
  const cards = Array.isArray(config.cards)
    ? config.cards.map((card) => ({
        ...card,
        history: Array.isArray(card.history) ? [...card.history] : undefined,
      }))
    : [];

  return {
    title: "Energy Overview",
    ...config,
    cards,
  };
}
