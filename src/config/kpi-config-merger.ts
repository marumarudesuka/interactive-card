import type { CustomKpiConfig, KpiTemplate } from "../types/kpi";
import type {
  KpiConfigOrigin,
  KpiConfigSources,
  KpiConfigValidation,
  ResolvedKpiConfig,
} from "../types/kpi-config-resolution";

interface MergeRecord {
  identity: string;
  config: CustomKpiConfig;
  origin: KpiConfigOrigin;
  templateId?: string;
  entityLocked: boolean;
}

function isConfiguredValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim().length > 0;
}

function configuredString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function cloneConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function hasExplicitEntityLock(config: CustomKpiConfig): boolean {
  const metadata = config.metadata;
  return Boolean(
    metadata &&
    typeof metadata === "object" &&
    (metadata as { entityLocked?: unknown }).entityLocked === true
  );
}

function mergeConfigLayers(
  ...layers: readonly CustomKpiConfig[]
): CustomKpiConfig {
  const merged: CustomKpiConfig = {};

  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (isConfiguredValue(value)) {
        merged[key] = cloneConfigValue(value);
      }
    }
  }

  return merged;
}

function configFromTemplate(template: KpiTemplate): CustomKpiConfig {
  const templateEntity =
    configuredString(template.entity) ??
    configuredString(template.defaultEntity);

  return mergeConfigLayers({
    id: template.id,
    title: template.title,
    entity: templateEntity,
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
  });
}

function normalizedTitle(config: CustomKpiConfig): string | undefined {
  return configuredString(config.title)?.trim().toLowerCase();
}

function findMatchingRecord(
  records: readonly MergeRecord[],
  config: CustomKpiConfig
): MergeRecord | undefined {
  const id = configuredString(config.id);
  if (id) {
    return records.find(
      (record) => configuredString(record.config.id) === id
    );
  }

  const entity = configuredString(config.entity);
  if (entity) {
    const entityMatch = records.find(
      (record) => configuredString(record.config.entity) === entity
    );
    if (entityMatch) return entityMatch;
  }

  const title = normalizedTitle(config);
  if (!title) return undefined;
  return records.find((record) => normalizedTitle(record.config) === title);
}

function createIdentity(
  config: CustomKpiConfig,
  origin: KpiConfigOrigin,
  sourceIndex: number
): string {
  const id = configuredString(config.id);
  if (id) return `id:${id}`;

  const entity = configuredString(config.entity);
  if (entity) return `entity:${entity}`;

  const title = normalizedTitle(config);
  if (title) return `title:${title}`;

  return `${origin}:anonymous:${sourceIndex}`;
}

function mergeSource(
  records: MergeRecord[],
  cards: readonly CustomKpiConfig[],
  origin: "repository" | "yaml"
): void {
  cards.forEach((card, sourceIndex) => {
    const existing = findMatchingRecord(records, card);
    const entityLocked =
      origin === "yaml" && hasExplicitEntityLock(card);

    if (existing) {
      const sourceCard =
        origin === "yaml" &&
        !entityLocked &&
        existing.origin === "repository" &&
        Boolean(configuredString(existing.config.entity))
          ? { ...card, entity: undefined }
          : card;
      existing.config = mergeConfigLayers(existing.config, sourceCard);
      existing.origin = origin;
      existing.entityLocked ||= entityLocked;
      return;
    }

    records.push({
      identity: createIdentity(card, origin, sourceIndex),
      config: mergeConfigLayers(card),
      origin,
      entityLocked,
    });
  });
}

function getDiscoveryEntity(
  record: MergeRecord,
  discovery: KpiConfigSources["discovery"]
): string | undefined {
  if (!discovery) return undefined;

  const keys = [
    record.templateId,
    configuredString(record.config.id),
    normalizedTitle(record.config),
  ].filter((key): key is string => Boolean(key));

  for (const key of keys) {
    const entityId = configuredString(discovery[key]?.[0]?.entityId);
    if (entityId) return entityId;
  }

  return undefined;
}

function validateResolvedConfig(
  config: CustomKpiConfig
): KpiConfigValidation {
  const errors: KpiConfigValidation["errors"] = {};
  const hasLegacyIdentity = Boolean(
    configuredString(config.id) ||
      configuredString(config.entity) ||
      normalizedTitle(config)
  );

  if (!hasLegacyIdentity) {
    errors.id = "Card identity required";
  }

  if (config.enabled === true && !configuredString(config.entity)) {
    errors.entity = "Entity required";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mergeKpiConfigSources(
  sources: KpiConfigSources
): ResolvedKpiConfig[] {
  const records: MergeRecord[] = sources.templates.map((template) => ({
    identity: `id:${template.id}`,
    config: configFromTemplate(template),
    origin: "template",
    templateId: template.id,
    entityLocked: false,
  }));

  mergeSource(records, sources.repositoryCards ?? [], "repository");
  mergeSource(records, sources.yamlCards ?? [], "yaml");

  return records.map((record) => {
    let config = mergeConfigLayers(record.config);

    if (!configuredString(config.entity)) {
      const discoveredEntity = getDiscoveryEntity(record, sources.discovery);
      if (discoveredEntity) {
        config = mergeConfigLayers(config, { entity: discoveredEntity });
      }
    }

    return {
      identity: record.identity,
      config,
      metadata: {
        origin: record.origin,
        templateId: record.templateId,
        entityLocked: record.entityLocked,
        removable: record.templateId === undefined,
      },
      validation: validateResolvedConfig(config),
    };
  });
}
