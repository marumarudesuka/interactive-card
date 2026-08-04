import type { CustomKpiConfig } from "../types/kpi";
import type { KpiConfigRepository } from "./kpi-config-repository";

function cloneCards(
  cards: readonly CustomKpiConfig[]
): CustomKpiConfig[] {
  return cards.map((card) => ({
    ...card,
    history: Array.isArray(card.history) ? [...card.history] : undefined,
  }));
}

export class InMemoryKpiConfigRepository
  implements KpiConfigRepository {
  private cards: CustomKpiConfig[];

  constructor(initialCards: readonly CustomKpiConfig[] = []) {
    this.cards = cloneCards(initialCards);
  }

  async load(): Promise<CustomKpiConfig[]> {
    return cloneCards(this.cards);
  }

  async save(cards: readonly CustomKpiConfig[]): Promise<void> {
    this.cards = cloneCards(cards);
  }
}
