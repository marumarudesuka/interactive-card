import type { TrendAnalysisResult, TrendAnalyzerInput } from "../trend-analysis-model.ts";
import { formatAnalysisTime, formatAnalysisValue } from "../trend-analysis-model.ts";

export function analyzeCost(input: TrendAnalyzerInput): TrendAnalysisResult {
  const points = input.series.points;
  if (points.length < 2) return { metricType: "cost", facts: [], pattern: "Not enough cost history is available for analysis." };
  let highestIndex = 1;
  for (let index = 2; index < points.length; index++) {
    if (points[index].value - points[index - 1].value > points[highestIndex].value - points[highestIndex - 1].value) highestIndex = index;
  }
  return {
    metricType: "cost",
    facts: [
      { label: "Cost change", value: formatAnalysisValue(input.series, points.at(-1)!.value - points[0].value) },
      { label: "Highest-cost interval", value: `${formatAnalysisTime(points[highestIndex - 1].timestamp)} – ${formatAnalysisTime(points[highestIndex].timestamp)}` },
    ],
    pattern: "The highlighted interval contains the largest recorded cost increase.",
  };
}
