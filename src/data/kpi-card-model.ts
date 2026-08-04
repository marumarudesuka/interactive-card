import type { HomeAssistant } from "custom-card-helpers";

import type {
  CustomKpiConfig,
  KpiCardConfig,
  KpiTemplate,
} from "../config/config.types";
import {
  discoverForTemplates,
  type DiscoveryTemplate,
} from "./entity-discovery.ts";

export interface EntityUpdateResult {
  cards: CustomKpiConfig[];
  changed: boolean;
  locked: boolean;
}

function firstConfiguredEntity(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
}

export function getKpiCardKey(card: KpiCardConfig): string | undefined {
  return card.id ?? card.entity ?? card.title;
}

export function createDiscoveryTemplates(
  templates: readonly KpiTemplate[]
): DiscoveryTemplate[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    match: {
      keywords: template.keyword
        ? [template.keyword]
        : template.keywords ?? [],
      units: template.unit
        ? [template.unit]
        : template.units ?? [],
    },
  }));
}

function createConfigFromTemplate(template: KpiTemplate): CustomKpiConfig {
  return {
    id: template.id,
    title: template.title,
    entity: firstConfiguredEntity(template.entity, template.defaultEntity),
    category: template.category,
    unit: template.unit,
    icon: template.icon,
    enabled: template.defaultEnabled ?? false,
    entityType: template.entityType,
    autoScale: template.autoScale ?? false,
    decimals: template.decimals ?? 2,
    icon_bg: template.icon_bg,
    icon_glow: template.icon_glow,
    icon_color: template.icon_color,
  };
}

export function mergeKpiCards(
  cards: CustomKpiConfig[],
  templates: readonly KpiTemplate[],
  discoveryResults: Record<string, any[]> = {}
): CustomKpiConfig[] {
  const mapped = new Map<string, CustomKpiConfig>();

  for (const card of cards) {
    if (card.id) mapped.set(card.id, card);
    if (card.title) mapped.set(card.title.trim().toLowerCase(), card);
    if (card.entity) mapped.set(card.entity, card);
  }

  const merged = templates.map((template) => {
    let existing = mapped.get(template.id);

    if (!existing && template.title) {
      existing = mapped.get(template.title.trim().toLowerCase());
    }

    if (!existing && template.entity) {
      existing = mapped.get(template.entity);
    }

    if (!existing && template.title) {
      existing = cards.find(
        (card) =>
          (card.title ?? "").trim().toLowerCase() ===
          template.title.trim().toLowerCase()
      );
    }

    const resolvedEntity = firstConfiguredEntity(
      existing?.entity,
      template.entity,
      template.defaultEntity,
      discoveryResults[template.id]?.[0]?.entityId
    );

    const enabled =
      typeof existing?.enabled === "boolean"
        ? existing.enabled
        : existing
          ? true
          : Boolean(template.defaultEnabled);

    const templateConfig = createConfigFromTemplate(template);

    return {
      ...templateConfig,
      ...(existing ?? {}),
      entity: resolvedEntity,
      enabled,
      autoScale: existing?.autoScale ?? template.autoScale ?? false,
      decimals: existing?.decimals ?? template.decimals ?? 2,
    };
  });

  const extraCards = cards.filter((card) => {
    const key = getKpiCardKey(card);
    return !templates.some(
      (template) =>
        key &&
        (template.id === key ||
          template.entity === card.entity ||
          template.title === card.title)
    );
  });

  return [...merged, ...extraCards];
}

export function resolveKpiCards(
  hass: HomeAssistant,
  cards: CustomKpiConfig[],
  templates: readonly KpiTemplate[]
): CustomKpiConfig[] {
  const discoveryResults = discoverForTemplates(
    hass,
    createDiscoveryTemplates(templates)
  );
  return mergeKpiCards(cards, templates, discoveryResults);
}

export function toggleKpiCard(
  cards: CustomKpiConfig[],
  template: KpiTemplate
): CustomKpiConfig[] {
  let found = false;
  const updated = cards.map((card) => {
    if (card.id !== template.id) return card;
    found = true;
    return {
      ...card,
      enabled: !Boolean(card.enabled),
    };
  });

  if (found) return updated;

  return [
    ...updated,
    {
      ...createConfigFromTemplate(template),
      enabled: true,
    },
  ];
}

export function disableKpiCard(
  cards: KpiCardConfig[],
  id: string
): KpiCardConfig[] {
  return cards.map((card) =>
    card.id === id ? { ...card, enabled: false } : card
  );
}

export function updateKpiCardEntity(
  cards: KpiCardConfig[],
  key: string,
  entityId: string,
  entityLocks: Readonly<Record<string, boolean>>
): EntityUpdateResult {
  let changed = false;
  let locked = false;

  const updated = cards.map((card) => {
    if (getKpiCardKey(card) !== key) return card;

    if (entityLocks[key] === true) {
      locked = true;
      return card;
    }

    if (card.entity === entityId) return card;
    changed = true;
    return { ...card, entity: entityId };
  });

  return { cards: updated, changed, locked };
}

export function reorderKpiCards(
  cards: KpiCardConfig[],
  from: number,
  to: number
): KpiCardConfig[] {
  if (from === to) return cards;
  const reordered = [...cards];
  const [moved] = reordered.splice(from, 1);
  if (!moved) return cards;
  reordered.splice(to, 0, moved);
  return reordered;
}
