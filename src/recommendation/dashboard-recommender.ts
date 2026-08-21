import type { DiscoveredMetric } from "../discovery/discovery.types";
import type { DashboardRecommendationPreview } from "./recommendation.types";
import { recommendCircuits } from "./circuit-recommender.ts";
import { recommendKpis } from "./kpi-recommender.ts";
import { recommendTrendSeries } from "./trend-recommender.ts";

export function recommendDashboard(
  metrics:readonly DiscoveredMetric[]
):DashboardRecommendationPreview {
  return {
    kpis:recommendKpis(metrics),
    trend:recommendTrendSeries(metrics),
    circuits:recommendCircuits(metrics),
    availableMetricCount:metrics.filter((metric) => metric.available).length,
    unavailableMetricCount:metrics.filter((metric) => !metric.available).length,
  };
}
