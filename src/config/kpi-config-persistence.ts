import type { CustomKpiConfig, KpiTemplate } from "../types/kpi";
import type { KpiConfigSources } from "../types/kpi-config-resolution";

export interface KpiRepositorySnapshotInput {
  cards: readonly CustomKpiConfig[];
  templates: readonly KpiTemplate[];
  yamlCards?: readonly CustomKpiConfig[];
  discovery?: KpiConfigSources["discovery"];
}

const derivedKeys = new Set([
  "identity",
  "metadata",
  "validation",
  "discovery",
]);

function isConfigured(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim().length > 0;
}

function configuredString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function hasExplicitEntityLock(
  config: CustomKpiConfig | undefined
): boolean {
  const metadata = config?.metadata;
  return Boolean(
    metadata &&
    typeof metadata === "object" &&
    (metadata as { entityLocked?: unknown }).entityLocked === true
  );
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }
  return left === right;
}

function normalizedTitle(config: CustomKpiConfig): string | undefined {
  return configuredString(config.title)?.trim().toLowerCase();
}

function sameIdentity(
  left: CustomKpiConfig,
  right: CustomKpiConfig
): boolean {
  const leftId = configuredString(left.id);
  const rightId = configuredString(right.id);
  if (leftId || rightId) return Boolean(leftId && leftId === rightId);

  const leftEntity = configuredString(left.entity);
  const rightEntity = configuredString(right.entity);
  if (leftEntity && rightEntity) return leftEntity === rightEntity;

  const leftTitle = normalizedTitle(left);
  const rightTitle = normalizedTitle(right);
  return Boolean(leftTitle && leftTitle === rightTitle);
}

function templateDefaults(template: KpiTemplate): CustomKpiConfig {
  return {
    id: template.id,
    title: template.title,
    entity:
      configuredString(template.entity) ??
      configuredString(template.defaultEntity),
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

function discoveryEntity(
  card: CustomKpiConfig,
  template: KpiTemplate | undefined,
  discovery: KpiConfigSources["discovery"]
): string | undefined {
  if (!discovery) return undefined;
  const keys = [
    template?.id,
    configuredString(card.id),
    normalizedTitle(card),
  ].filter((key): key is string => Boolean(key));

  for (const key of keys) {
    const entityId = configuredString(discovery[key]?.[0]?.entityId);
    if (entityId) return entityId;
  }
  return undefined;
}

function projectTemplateOverride(
  card: CustomKpiConfig,
  template: KpiTemplate,
  yamlCard: CustomKpiConfig | undefined,
  discovery: KpiConfigSources["discovery"]
): CustomKpiConfig | undefined {
  const defaults = templateDefaults(template);
  const projected: CustomKpiConfig = { id: template.id };

  for (const [key, value] of Object.entries(card)) {
    if (key === "id" || derivedKeys.has(key) || !isConfigured(value)) continue;
    if (
      yamlCard &&
      isConfigured(yamlCard[key]) &&
      (
        key !== "entity" ||
        hasExplicitEntityLock(yamlCard) ||
        valuesEqual(value, yamlCard[key])
      )
    ) {
      continue;
    }

    if (key === "entity") {
      const discovered = discoveryEntity(card, template, discovery);
      if (
        valuesEqual(value, defaults.entity) ||
        valuesEqual(value, discovered)
      ) {
        continue;
      }
    } else if (valuesEqual(value, defaults[key])) {
      continue;
    }

    projected[key] = cloneValue(value);
  }

  return Object.keys(projected).length > 1 ? projected : undefined;
}

function projectCustomCard(
  card: CustomKpiConfig,
  yamlCard: CustomKpiConfig | undefined
): CustomKpiConfig | undefined {
  const projected: CustomKpiConfig = {};
  const identityKey = configuredString(card.id)
    ? "id"
    : configuredString(card.entity)
      ? "entity"
      : normalizedTitle(card)
        ? "title"
        : undefined;

  if (identityKey) {
    projected[identityKey] = card[identityKey] as string;
  }

  for (const [key, value] of Object.entries(card)) {
    if (key === identityKey) continue;
    if (derivedKeys.has(key) || !isConfigured(value)) continue;
    if (
      yamlCard &&
      isConfigured(yamlCard[key]) &&
      (
        key !== "entity" ||
        hasExplicitEntityLock(yamlCard) ||
        valuesEqual(value, yamlCard[key])
      )
    ) {
      continue;
    }
    projected[key] = cloneValue(value);
  }

  const minimumKeys = identityKey ? 1 : 0;
  return Object.keys(projected).length > minimumKeys || !yamlCard
    ? projected
    : undefined;
}

export function buildKpiRepositorySnapshot(
  input: KpiRepositorySnapshotInput
): CustomKpiConfig[] {
  const snapshot: CustomKpiConfig[] = [];

  for (const card of input.cards) {
    const template = configuredString(card.id)
      ? input.templates.find((item) => item.id === card.id)
      : undefined;
    const yamlCard = input.yamlCards?.find((item) =>
      sameIdentity(item, card)
    );

    const projected = template
      ? projectTemplateOverride(
          card,
          template,
          yamlCard,
          input.discovery
        )
      : projectCustomCard(card, yamlCard);

    if (projected) snapshot.push(projected);
  }

  return snapshot;
}
