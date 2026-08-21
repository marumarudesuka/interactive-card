import type { TrendAnalysisResult, TrendAnalyzerInput } from "../trend-analysis-model.ts";
import { formatAnalysisTime, formatAnalysisValue } from "../trend-analysis-model.ts";

export function analyzeEnergy(input: TrendAnalyzerInput): TrendAnalysisResult {
  const points = input.series.points;
  if (points.length < 2) return { metricType: "energy", facts: [], pattern: "Not enough energy history is available for analysis." };
  let largestIndex = 1;
  for (let index = 2; index < points.length; index++) {
    if (points[index].value - points[index - 1].value > points[largestIndex].value - points[largestIndex - 1].value) largestIndex = index;
  }
  return {
    metricType: "energy",
    facts: [
      { label: "Accumulated change", value: formatAnalysisValue(input.series, points.at(-1)!.value - points[0].value) },
      { label: "Usage concentration", value: `${formatAnalysisTime(points[largestIndex - 1].timestamp)} – ${formatAnalysisTime(points[largestIndex].timestamp)}` },
    ],
    pattern: "The highlighted interval contains the largest recorded increase.",
  };
}
