import type { HomeAssistant } from "custom-card-helpers";

import type {
  CustomKpiConfig,
  KpiTemplate,
} from "../config/config.types";
import {
  getKpiCardKey,
  reorderKpiCards,
  resolveKpiCards,
  toggleKpiCard,
  updateKpiCardEntity,
  type EntityUpdateResult,
} from "./kpi-card-model.ts";

export interface CardMutationResult {
  cards: CustomKpiConfig[];
  changed: boolean;
}

export class KpiCardManager {
  private readonly templates: readonly KpiTemplate[];

  constructor(templates: readonly KpiTemplate[]) {
    this.templates = templates;
  }

  resolve(
    hass: HomeAssistant,
    cards: CustomKpiConfig[]
  ): CustomKpiConfig[] {
    return resolveKpiCards(hass, cards, this.templates);
  }

  create(
    cards: CustomKpiConfig[],
    card: CustomKpiConfig
  ): CardMutationResult {
    const key = getKpiCardKey(card);
    if (
      key &&
      cards.some((existing) => getKpiCardKey(existing) === key)
    ) {
      return { cards, changed: false };
    }

    return {
      cards: [...cards, { ...card }],
      changed: true,
    };
  }

  update(
    cards: CustomKpiConfig[],
    key: string,
    changes: Partial<CustomKpiConfig>
  ): CardMutationResult {
    let changed = false;
    const updated = cards.map((card) => {
      if (getKpiCardKey(card) !== key) return card;

      const hasChange = Object.entries(changes).some(
        ([property, value]) => card[property] !== value
      );
      if (!hasChange) return card;

      changed = true;
      return { ...card, ...changes };
    });

    return {
      cards: changed ? updated : cards,
      changed,
    };
  }

  remove(cards: CustomKpiConfig[], key: string): CardMutationResult {
    const updated = cards.filter((card) => getKpiCardKey(card) !== key);
    return {
      cards: updated.length === cards.length ? cards : updated,
      changed: updated.length !== cards.length,
    };
  }

  enable(cards: CustomKpiConfig[], key: string): CardMutationResult {
    return this.update(cards, key, { enabled: true });
  }

  disable(cards: CustomKpiConfig[], key: string): CardMutationResult {
    return this.update(cards, key, { enabled: false });
  }

  toggleTemplate(
    cards: CustomKpiConfig[],
    template: KpiTemplate
  ): CardMutationResult {
    const updated = toggleKpiCard(cards, template);
    return { cards: updated, changed: updated !== cards };
  }

  updateEntity(
    cards: CustomKpiConfig[],
    key: string,
    entityId: string,
    entityLocks: Readonly<Record<string, boolean>>
  ): EntityUpdateResult {
    return updateKpiCardEntity(cards, key, entityId, entityLocks);
  }

  reorder(
    cards: CustomKpiConfig[],
    from: number,
    to: number
  ): CardMutationResult {
    const reordered = reorderKpiCards(cards, from, to).map(
      (card, index) =>
        card.type === "custom" || card.id?.startsWith("custom-")
          ? { ...card, order: index }
          : card
    );
    return {
      cards: reordered,
      changed: reordered !== cards,
    };
  }
}
