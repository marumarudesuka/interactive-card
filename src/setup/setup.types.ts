import type {
  CircuitRecommendation,
  DashboardRecommendationPreview,
  KpiRecommendation,
  TrendRecommendation,
} from "../recommendation/recommendation.types";

export interface SetupBaseItem<TSource> {
  enabled:boolean;
  entityId:string;
  displayName:string;
  order:number;
  source:TSource;
}

export interface SetupKpiItem extends SetupBaseItem<KpiRecommendation> {
  kind:KpiRecommendation["kind"];
  title:string;
}

export type SetupTrendItem = SetupBaseItem<TrendRecommendation>;
export type SetupCircuitItem = SetupBaseItem<CircuitRecommendation>;

export interface SetupDraft {
  kpis:SetupKpiItem[];
  trend:SetupTrendItem[];
  circuits:SetupCircuitItem[];
  source:DashboardRecommendationPreview;
}

export type SetupSection = "kpis" | "trend" | "circuits";

export interface SetupCompleteDetail {
  draft:SetupDraft;
}
