import type { CustomKpiConfig, KpiTemplate } from "./kpi";

export interface KpiDiscoveryCandidate {
  entityId: string;
}

export interface KpiConfigSources {
  templates: readonly KpiTemplate[];
  repositoryCards?: readonly CustomKpiConfig[];
  yamlCards?: readonly CustomKpiConfig[];
  discovery?: Readonly<
    Record<string, readonly KpiDiscoveryCandidate[]>
  >;
}

export type KpiConfigOrigin = "template" | "repository" | "yaml";

export interface KpiConfigValidation {
  valid: boolean;
  errors: {
    entity?: string;
    id?: string;
  };
}

export interface ResolvedKpiMetadata {
  origin: KpiConfigOrigin;
  templateId?: string;
  entityLocked: boolean;
  removable: boolean;
}

export interface ResolvedKpiConfig {
  identity: string;
  config: CustomKpiConfig;
  metadata: ResolvedKpiMetadata;
  validation: KpiConfigValidation;
}
