import type { TrendPoint } from "../../../../types/trend";
import type {
  TrendAnalysisEvent,
  TrendAnalysisResult,
  TrendAnalyzerInput,
} from "../trend-analysis-model.ts";
import { formatAnalysisTime, formatAnalysisValue } from "../trend-analysis-model.ts";

const MIN_ANALYSIS_POINTS = 8;

type Direction = "rising" | "falling" | "flat";
type Pattern = "stable" | "volatile" | "spike" | "repeated_peaks" | "sustained_high" | "mixed";
type CandidateKind = "peak" | "rise" | "drop" | "high" | "normal";

interface CandidateEvent extends TrendAnalysisEvent {
  kind: CandidateKind;
  endTimestamp?: number;
  delta?: number;
  peakValue?: number;
}

function hasMeaningfulRecovery(
  points: readonly TrendPoint[],
  leftPeak: TrendPoint,
  rightPeak: TrendPoint,
  recoveryLevel: number,
): boolean {
  return points.some((point) =>
    point.timestamp > leftPeak.timestamp &&
    point.timestamp < rightPeak.timestamp &&
    point.value <= recoveryLevel
  );
}

function deduplicatePeakEvents(
  events: readonly CandidateEvent[],
  points: readonly TrendPoint[],
  recoveryLevel: number,
): CandidateEvent[] {
  const result: CandidateEvent[] = [];
  for (const event of events) {
    if (event.kind !== "peak") {
      result.push(event);
      continue;
    }

    const previousIndex = result.findLastIndex((candidate) => candidate.kind === "peak");
    const previous = result[previousIndex];
    if (!previous) {
      result.push(event);
      continue;
    }

    const previousPoint = { timestamp: previous.endTimestamp ?? previous.timestamp, value: previous.peakValue ?? 0 };
    const eventPoint = { timestamp: event.endTimestamp ?? event.timestamp, value: event.peakValue ?? 0 };
    if (hasMeaningfulRecovery(points, previousPoint, eventPoint, recoveryLevel)) {
      result.push(event);
      continue;
    }

    if ((event.peakValue ?? Number.NEGATIVE_INFINITY) >
      (previous.peakValue ?? Number.NEGATIVE_INFINITY)) {
      result[previousIndex] = event;
    }
  }
  return result;
}

function buildPeakEventWindows(
  points: readonly TrendPoint[],
  peaks: readonly TrendPoint[],
  rawPeaks: readonly TrendPoint[],
  recoveryLevel: number,
  medianInterval: number,
  totalDuration: number,
  minimumHighDuration: number,
  center: number,
  fullRange: number,
  formatPower: (value: number) => string,
): CandidateEvent[] {
  const minimumIntervalDuration = Math.max(medianInterval * 2, totalDuration * 0.005, 1);

  return peaks.map((peak) => {
    const peakIndex = points.findIndex((point) => point.timestamp === peak.timestamp);
    let startIndex = peakIndex;
    let endIndex = peakIndex;
    while (startIndex > 0 && points[startIndex - 1].value > recoveryLevel) startIndex--;
    while (endIndex < points.length - 1 && points[endIndex + 1].value > recoveryLevel) endIndex++;

    const start = points[startIndex];
    const end = points[endIndex];
    const eventDuration = end.timestamp - start.timestamp;
    const sampleCount = endIndex - startIndex + 1;
    const windowPeaks = rawPeaks.filter((candidate) =>
      candidate.timestamp >= start.timestamp && candidate.timestamp <= end.timestamp
    );
    const intervalEvent = sampleCount >= 3 && eventDuration >= minimumIntervalDuration;
    const repeatedPeakPeriod = intervalEvent && windowPeaks.length >= 2;
    const sustained = intervalEvent && eventDuration >= minimumHighDuration;
    const magnitudeScore = (peak.value - center) / Math.max(fullRange, 1e-9);
    const durationScore = eventDuration / Math.max(totalDuration, medianInterval, 1);

    if (!intervalEvent) {
      return {
        kind: "peak",
        timestamp: peak.timestamp,
        time: `Around ${formatAnalysisTime(peak.timestamp)}`,
        label: "Significant peak",
        detail: formatPower(peak.value),
        peakValue: peak.value,
        importance: 90 + Math.min(9, magnitudeScore * 8),
      };
    }

    return {
      kind: "peak",
      timestamp: start.timestamp,
      endTimestamp: end.timestamp,
      time: timeRange(start.timestamp, end.timestamp),
      label: repeatedPeakPeriod
        ? "Repeated peak period"
        : sustained ? "Sustained high load" : "High-load period",
      detail: repeatedPeakPeriod
        ? `Power stayed elevated through several peaks, reaching ${formatPower(peak.value)}`
        : `Power remained significantly above the normal range, reaching ${formatPower(peak.value)}`,
      peakValue: peak.value,
      importance: 88 + Math.min(7, magnitudeScore * 6) + Math.min(5, durationScore * 25),
    };
  });
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(values: readonly number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower] + ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * fraction;
}

function powerDecimals(value: number): number {
  return Math.abs(value) >= 1_000 ? 2 : 0;
}

function timeRange(start: number, end: number): string {
  return start === end
    ? formatAnalysisTime(start)
    : `${formatAnalysisTime(start)}–${formatAnalysisTime(end)}`;
}

export function analyzePower(input: TrendAnalyzerInput): TrendAnalysisResult {
  const points = input.series.points
    .filter((point) => Number.isFinite(point.value) && Number.isFinite(point.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);
  if (points.length < MIN_ANALYSIS_POINTS) {
    return {
      metricType: "power",
      facts: [],
      pattern: "Not enough data for pattern analysis.",
      summary: [],
      keyEvents: [],
      insight: "Not enough data for pattern analysis.",
    };
  }

  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const fullRange = maximum - minimum;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const center = median(values);
  const intervals = points.slice(1)
    .map((point, index) => point.timestamp - points[index].timestamp)
    .filter((interval) => interval > 0);
  const medianInterval = median(intervals);
  const duration = points.at(-1)!.timestamp - points[0].timestamp;
  const clusterWindow = Math.max(medianInterval * 1.5, 1);
  const formatPower = (value: number) => formatAnalysisValue(input.series, value, powerDecimals(value));

  const windowSize = Math.max(3, Math.floor(points.length * 0.15));
  const startLevel = median(points.slice(0, windowSize).map((point) => point.value));
  const endLevel = median(points.slice(-windowSize).map((point) => point.value));
  const directionalChange = endLevel - startLevel;
  const directionScale = Math.max(Math.abs(startLevel), Math.abs(center), iqr, fullRange * 0.1, 1e-9);
  const changePercent = directionalChange / directionScale * 100;
  const directionThreshold = Math.max(iqr * 0.12, fullRange * 0.035, Math.abs(center) * 0.02, 1e-9);
  const direction: Direction = Math.abs(directionalChange) <= directionThreshold
    ? "flat"
    : directionalChange > 0 ? "rising" : "falling";

  const changes = points.slice(1).map((point, index) => {
    const previous = points[index];
    const interval = point.timestamp - previous.timestamp;
    const delta = point.value - previous.value;
    return {
      point,
      previous,
      interval,
      delta,
      normalizedDelta: interval > 0 ? delta * medianInterval / interval : 0,
    };
  }).filter((change) => change.interval > 0 && change.interval <= Math.max(medianInterval * 3, 1));
  const medianAbsoluteChange = median(changes.map((change) => Math.abs(change.normalizedDelta)));
  const flatTolerance = Math.max(Math.abs(center) * 0.03, 1);
  const flatData =
    fullRange <= Math.max(flatTolerance, medianAbsoluteChange * 3) &&
    medianAbsoluteChange <= Math.max(flatTolerance, fullRange * 0.1);
  const sharpThreshold = Math.max(medianAbsoluteChange * 4, iqr * 0.35, fullRange * 0.14, 1e-9);
  const sharpChanges = changes.filter((change) => {
    const relativeScale = Math.max(Math.abs(change.previous.value), iqr, fullRange * 0.1, 1e-9);
    return Math.abs(change.normalizedDelta) >= sharpThreshold &&
      Math.abs(change.delta) / relativeScale >= 0.15;
  });

  const peakThreshold = center + Math.max(iqr * 1.5, fullRange * 0.22, medianAbsoluteChange * 4, 1e-9);
  const rawPeaks = points.filter((point, index) => index > 0 && index < points.length - 1 &&
    point.value >= peakThreshold && point.value > points[index - 1].value && point.value >= points[index + 1].value
  );
  const recoveryLevel = center + Math.max(iqr * 0.5, fullRange * 0.08, medianAbsoluteChange * 2, 1e-9);
  const peakClusters: TrendPoint[] = [];
  for (const point of rawPeaks) {
    const previous = peakClusters.at(-1);
    const separatedByRecovery = previous && hasMeaningfulRecovery(points, previous, point, recoveryLevel);
    if (!previous || (point.timestamp - previous.timestamp > clusterWindow * 2 && separatedByRecovery)) {
      peakClusters.push(point);
    } else if (point.value > previous.value) {
      peakClusters[peakClusters.length - 1] = point;
    }
  }

  const candidates: CandidateEvent[] = peakClusters.map((point) => ({
    kind: "peak",
    timestamp: point.timestamp,
    time: formatAnalysisTime(point.timestamp),
    label: "Significant peak",
    detail: formatPower(point.value),
    peakValue: point.value,
    importance: 90 + Math.min(9, (point.value - center) / Math.max(fullRange, 1) * 10),
  }));
  for (const change of sharpChanges) {
    candidates.push({
      kind: change.delta > 0 ? "rise" : "drop",
      timestamp: change.point.timestamp,
      time: formatAnalysisTime(change.point.timestamp),
      label: change.delta > 0 ? "Sharp rise" : "Sharp drop",
      detail: `${change.delta > 0 ? "+" : "−"}${formatPower(Math.abs(change.delta))}`,
      delta: change.delta,
      importance: 75 + Math.min(14, Math.abs(change.normalizedDelta) / sharpThreshold * 5),
    });
  }

  const highThreshold = q3 + Math.max(iqr * 0.25, fullRange * 0.04);
  const minimumHighDuration = Math.max(medianInterval * 3, duration * 0.08);
  let highStart = -1;
  let longestHigh: { start: TrendPoint; end: TrendPoint; duration: number } | undefined;
  for (let index = 0; index <= points.length; index++) {
    const high = index < points.length && points[index].value >= highThreshold;
    if (high && highStart < 0) highStart = index;
    if (!high && highStart >= 0) {
      const endIndex = index - 1;
      const highDuration = points[endIndex].timestamp - points[highStart].timestamp;
      if (endIndex - highStart >= 2 && highDuration >= minimumHighDuration &&
        (!longestHigh || highDuration > longestHigh.duration)) {
        longestHigh = { start: points[highStart], end: points[endIndex], duration: highDuration };
      }
      highStart = -1;
    }
  }
  if (longestHigh) {
    candidates.push({
      kind: "high",
      timestamp: longestHigh.start.timestamp,
      endTimestamp: longestHigh.end.timestamp,
      time: timeRange(longestHigh.start.timestamp, longestHigh.end.timestamp),
      label: "Sustained high load",
      importance: 82,
    });
    const endIndex = points.findIndex((point) => point.timestamp === longestHigh!.end.timestamp);
    const normalTolerance = Math.max(iqr * 0.75, fullRange * 0.08, 1e-9);
    const returned = points.slice(endIndex + 1).find((point) => Math.abs(point.value - center) <= normalTolerance);
    if (returned) {
      candidates.push({
        kind: "normal",
        timestamp: returned.timestamp,
        time: formatAnalysisTime(returned.timestamp),
        label: "Returned to normal range",
        importance: 68,
      });
    }
  }

  const clusterOrder: Record<CandidateKind, number> = {
    rise: 0,
    peak: 1,
    drop: 2,
    normal: 3,
    high: 4,
  };
  const ordered = [...candidates].sort((left, right) =>
    left.timestamp - right.timestamp || clusterOrder[left.kind] - clusterOrder[right.kind]
  );
  const clustered: CandidateEvent[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (current.kind === "rise" && next?.kind === "peak" &&
      next.timestamp - current.timestamp <= clusterWindow) {
      clustered.push({
        kind: "peak",
        timestamp: current.timestamp,
        endTimestamp: next.timestamp,
        time: timeRange(current.timestamp, next.timestamp),
        label: "Sharp power spike",
        detail: `Rose ${formatPower(Math.abs(current.delta ?? 0))} and peaked at ${formatPower(next.peakValue ?? 0)}`,
        peakValue: next.peakValue,
        importance: Math.max(current.importance, next.importance) + 5,
      });
      index++;
      continue;
    }
    if (current.kind === "drop" && next?.kind === "normal" &&
      next.timestamp - current.timestamp <= clusterWindow * 2) {
      clustered.push({
        kind: "drop",
        timestamp: current.timestamp,
        endTimestamp: next.timestamp,
        time: timeRange(current.timestamp, next.timestamp),
        label: "Sharp drop and recovery",
        detail: `Fell ${formatPower(Math.abs(current.delta ?? 0))} and returned to normal range`,
        delta: current.delta,
        importance: Math.max(current.importance, next.importance) + 3,
      });
      index++;
      continue;
    }
    clustered.push(current);
  }

  const semanticEvents = deduplicatePeakEvents(clustered, points, recoveryLevel);
  const independentPeakEvents = semanticEvents.filter((event) => event.kind === "peak");
  const repeatedPeaks = independentPeakEvents.length >= 2;
  const highVolatility = !flatData && medianAbsoluteChange > Math.max(iqr * 0.22, fullRange * 0.07, 1e-9);
  const hasSpike = independentPeakEvents.some((event) => event.label === "Sharp power spike") ||
    (independentPeakEvents.length === 1 && sharpChanges.length > 0);
  const disruptiveEvents = semanticEvents.filter((event) => event.kind === "rise" || event.kind === "drop" || event.kind === "peak");

  let pattern: Pattern;
  if (flatData && disruptiveEvents.length === 0) pattern = "stable";
  else if (longestHigh) pattern = "sustained_high";
  else if (repeatedPeaks) pattern = "repeated_peaks";
  else if (hasSpike) pattern = "spike";
  else if (highVolatility || disruptiveEvents.length >= 2) pattern = "volatile";
  else if (direction === "flat" && disruptiveEvents.length === 0) pattern = "stable";
  else pattern = "mixed";

  const peakEventWindows = buildPeakEventWindows(
    points,
    peakClusters,
    rawPeaks,
    recoveryLevel,
    medianInterval,
    duration,
    minimumHighDuration,
    center,
    fullRange,
    formatPower,
  );
  const coveredByPeakWindow = (event: CandidateEvent) => peakEventWindows.some((window) =>
    event.timestamp >= window.timestamp - clusterWindow &&
    event.timestamp <= (window.endTimestamp ?? window.timestamp) + clusterWindow
  );
  const windowedEvents = [
    ...semanticEvents.filter((event) => event.kind !== "peak" && !coveredByPeakWindow(event)),
    ...peakEventWindows,
  ];
  const deduplicatedWindowEvents = deduplicatePeakEvents(
    windowedEvents.sort((left, right) => left.timestamp - right.timestamp),
    points,
    recoveryLevel,
  );
  const priorityEvents = repeatedPeaks
    ? deduplicatedWindowEvents.filter((event) => event.kind === "peak")
    : [...deduplicatedWindowEvents];
  const keyEvents = priorityEvents
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 3)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ kind: _kind, endTimestamp: _endTimestamp, delta: _delta, peakValue: _peakValue, ...event }) => event);

  const directionWord = direction === "rising" ? "higher" : direction === "falling" ? "lower" : "close to";
  const endNearStart = direction === "flat";
  const patternLabels: Record<Pattern, { arrow: string; label: string }> = {
    stable: { arrow: "→", label: "Stable" },
    volatile: { arrow: "↕", label: "Volatile" },
    spike: { arrow: "↑", label: "Peak-heavy" },
    repeated_peaks: { arrow: "↕", label: "Peak-heavy" },
    sustained_high: { arrow: "→", label: "Sustained high" },
    mixed: { arrow: "↕", label: "Mixed" },
  };
  const overall = patternLabels[pattern];
  let overallExplanation: string;
  if (pattern === "stable") {
    overallExplanation = "Power remained within a narrow range throughout this period.";
  } else if (endNearStart) {
    overallExplanation = `Power returned close to its starting level, but ${pattern === "volatile" ? "varied significantly" : "showed notable peaks"} during the period.`;
  } else {
    overallExplanation = `${Math.abs(changePercent).toFixed(1)}% ${directionWord} than the start, with a ${overall.label.toLowerCase()} overall pattern.`;
  }

  let insight: string;
  if (pattern === "repeated_peaks") {
    insight = "Power showed multiple significant peaks during the selected period.";
  } else if (pattern === "spike") {
    const spike = independentPeakEvents[0];
    insight = spike
      ? `Power was dominated by a short spike around ${spike.time}, rather than a sustained change.`
      : "Power showed one short, significant spike during the selected period.";
  } else if (pattern === "sustained_high" && longestHigh) {
    insight = `Power stayed at a sustained high level from ${formatAnalysisTime(longestHigh.start.timestamp)} to ${formatAnalysisTime(longestHigh.end.timestamp)}.`;
  } else if (pattern === "volatile") {
    insight = "Power varied significantly across the period, with multiple changes larger than its typical movement.";
  } else if (pattern === "stable") {
    insight = "Power remained relatively stable throughout the selected period, without a significant event.";
  } else if (direction === "rising") {
    insight = "Power finished above its earlier level, but the period contained mixed short-term movement.";
  } else if (direction === "falling") {
    insight = "Power finished below its earlier level, but the period contained mixed short-term movement.";
  } else {
    insight = "Power returned near its starting level after mixed movement during the period.";
  }

  const peak = points.reduce((result, point) => point.value > result.value ? point : result);
  const peakTime = formatAnalysisTime(peak.timestamp);
  const peakValue = formatPower(peak.value);
  const rangeValue = `${formatPower(minimum)} — ${formatPower(maximum)}`;

  return {
    metricType: "power",
    facts: [
      { label: "Trend", value: `${direction} ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%` },
      { label: "Data range", value: rangeValue },
      { label: "Peak time", value: peakTime },
    ],
    pattern: insight,
    summary: [
      { label: "Overall", primary: `${overall.arrow} ${overall.label}`, secondary: overallExplanation },
      { label: "Peak", primary: `${peakValue} at ${peakTime}` },
      { label: "Range", primary: rangeValue },
    ],
    keyEvents,
    insight,
  };
}
