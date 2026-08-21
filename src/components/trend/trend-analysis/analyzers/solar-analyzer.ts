import type { TrendAnalysisResult, TrendAnalyzerInput } from "../trend-analysis-model.ts";
import { formatAnalysisTime, formatAnalysisValue } from "../trend-analysis-model.ts";

export function analyzeSolar(input: TrendAnalyzerInput): TrendAnalysisResult {
  const points = input.series.points;
  if (!points.length) return { metricType: "solar", facts: [], pattern: "No solar production history is available for this period." };
  const peak = points.reduce((result, point) => point.value > result.value ? point : result);
  const threshold = Math.max(0, peak.value * 0.02);
  const generating = points.filter((point) => point.value > threshold);
  return {
    metricType: "solar",
    facts: [
      { label: "Generation period", value: generating.length ? `${formatAnalysisTime(generating[0].timestamp)} – ${formatAnalysisTime(generating.at(-1)!.timestamp)}` : "No generation detected" },
      { label: "Generation peak", value: `${formatAnalysisValue(input.series, peak.value)} at ${formatAnalysisTime(peak.timestamp)}` },
    ],
    pattern: generating.length ? "Solar production was detected during the selected period." : "No meaningful solar production was detected.",
  };
}
