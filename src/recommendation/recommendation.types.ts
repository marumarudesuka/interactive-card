import type {
  DiscoveryEvidence,
  MetricType,
  SuggestedMetricRole,
} from "../discovery/discovery.types";

export interface RecommendationMetadata {
  entityId:string;
  displayName:string;
  metricType:MetricType;
  suggestedRole:SuggestedMetricRole;
  confidence:number;
  evidence:readonly DiscoveryEvidence[];
  reason:string;
  sourceAdapter?:string;
}

export type KpiRecommendationKind =
  | "current_power"
  | "daily_energy"
  | "total_energy"
  | "cost"
  | "solar";

export interface KpiRecommendation extends RecommendationMetadata {
  kind:KpiRecommendationKind;
  title:string;
}

export interface TrendRecommendation extends RecommendationMetadata {
  order:number;
}

export interface CircuitRecommendation extends RecommendationMetadata {
  order:number;
}

export interface DashboardRecommendationPreview {
  kpis:readonly KpiRecommendation[];
  trend:readonly TrendRecommendation[];
  circuits:readonly CircuitRecommendation[];
  availableMetricCount:number;
  unavailableMetricCount:number;
}
