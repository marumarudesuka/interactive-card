import type { CustomKpiConfig } from "./kpi";

export interface KpiCardDraft {
  id?: string;
  title?: string;
  entity?: string;
  category?: string;
  unit?: string;
  icon?: string;
  enabled?: boolean;
  autoScale?: boolean;
  decimals?: number | string;
  order?: number;
}

export interface NormalizedKpiCardDraft {
  id?: string;
  title: string;
  entity: string;
  category?: string;
  unit?: string;
  icon?: string;
  enabled: boolean;
  autoScale: boolean;
  decimals: number;
  order?: number;
}

export type KpiCardDraftField =
  | "id"
  | "title"
  | "entity"
  | "decimals";

export interface KpiCardDraftValidation {
  valid: boolean;
  errors: Partial<Record<KpiCardDraftField, string>>;
}

export type KpiCardBuildResult =
  | {
      valid: true;
      draft: NormalizedKpiCardDraft;
      config: CustomKpiConfig;
      validation: KpiCardDraftValidation;
    }
  | {
      valid: false;
      draft: NormalizedKpiCardDraft;
      validation: KpiCardDraftValidation;
    };
