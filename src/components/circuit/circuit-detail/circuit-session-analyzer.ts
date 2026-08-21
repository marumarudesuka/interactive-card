import { CIRCUIT_ACTIVE_POWER_THRESHOLD_W } from "../../../helpers/circuit-utils.ts";
import type {
  CircuitActivityEvent,
  CircuitHistoryPoint,
  CircuitSessionDetail,
} from "./circuit-detail-model.ts";

interface CircuitHistoryAnalysis {
  session: CircuitSessionDetail;
  activity: CircuitActivityEvent[];
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

export function analyzeCircuitHistory(
  history: readonly CircuitHistoryPoint[],
  currentlyActive: boolean,
  now = Date.now(),
): CircuitHistoryAnalysis {
  const points = [...history]
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.power))
    .sort((left, right) => left.timestamp - right.timestamp);
  if (!points.length) {
    return {
      session: { state: currentlyActive ? "current" : "unavailable" },
      activity: [],
    };
  }

  const offThreshold = CIRCUIT_ACTIVE_POWER_THRESHOLD_W * 0.6;
  const intervals = points.slice(1)
    .map((point, index) => point.timestamp - points[index].timestamp)
    .filter((value) => value > 0);
  const medianInterval = median(intervals);
  const confirmationSpan = Math.max(medianInterval * 0.75, 1);
  let active = points[0].power > CIRCUIT_ACTIVE_POWER_THRESHOLD_W;
  let openStart: number | undefined;
  let candidate: { target: "active" | "idle"; startedAt: number; samples: number } | undefined;
  const completed: Array<{ startedAt?: number; endedAt: number }> = [];
  const activity: CircuitActivityEvent[] = [];
  const confirmedState = [active];

  if (active) openStart = undefined;
  for (let index = 1; index < points.length; index++) {
    const point = points[index];
    const target = !active && point.power > CIRCUIT_ACTIVE_POWER_THRESHOLD_W
      ? "active"
      : active && point.power <= offThreshold ? "idle" : undefined;
    if (!target) {
      candidate = undefined;
    } else {
      candidate = candidate?.target === target
        ? { ...candidate, samples: candidate.samples + 1 }
        : { target, startedAt: point.timestamp, samples: 1 };
      const sustained = candidate.samples >= 2 && point.timestamp - candidate.startedAt >= confirmationSpan;
      if (sustained && target === "active") {
        active = true;
        openStart = candidate.startedAt;
        activity.push({ timestamp: candidate.startedAt, type: "active", label: "Became active" });
        candidate = undefined;
      } else if (sustained && target === "idle") {
        active = false;
        completed.push({ startedAt: openStart, endedAt: candidate.startedAt });
        activity.push({ timestamp: candidate.startedAt, type: "idle", label: "Became idle" });
        openStart = undefined;
        candidate = undefined;
      }
    }
    confirmedState.push(active);
  }

  const values = points.map((point) => point.power);
  const range = Math.max(...values) - Math.min(...values);
  const iqr = quantile(values, 0.75) - quantile(values, 0.25);
  const deltas = points.slice(1).map((point, index) => point.power - points[index].power);
  const significantDelta = Math.max(median(deltas.map(Math.abs)) * 4, iqr * 0.75, range * 0.15, CIRCUIT_ACTIVE_POWER_THRESHOLD_W);
  const eventWindow = Math.max(medianInterval * 2, 1);

  deltas.forEach((delta, index) => {
    if (Math.abs(delta) < significantDelta) return;
    if (!confirmedState[index] || !confirmedState[index + 1]) return;
    const timestamp = points[index + 1].timestamp;
    if (activity.some((event) => Math.abs(event.timestamp - timestamp) <= eventWindow)) return;
    activity.push({
      timestamp,
      type: delta > 0 ? "increase" : "decrease",
      label: delta > 0 ? "Power increased significantly" : "Power decreased significantly",
    });
  });

  let session: CircuitSessionDetail;
  if (currentlyActive) {
    session = openStart === undefined
      ? { state: "current" }
      : { state: "current", startedAt: openStart, duration: Math.max(0, now - openStart) };
  } else {
    const last = completed.at(-1);
    session = last
      ? {
          state: "last",
          startedAt: last.startedAt,
          endedAt: last.endedAt,
          duration: last.startedAt === undefined ? undefined : last.endedAt - last.startedAt,
        }
      : { state: "unavailable" };
  }

  return {
    session,
    activity: activity.sort((left, right) => right.timestamp - left.timestamp).slice(0, 3).reverse(),
  };
}
