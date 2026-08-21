export type CircuitRuntimeStatus = "active" | "idle" | "unavailable" | "unknown";

export interface CircuitActivityEvent {
  timestamp: number;
  type: "active" | "idle" | "increase" | "decrease" | "warning" | "unavailable" | "abnormal";
  label: string;
  detail?: string;
}

export type CircuitActivitySemantic = "active" | "idle" | "warning" | "info";

export interface CircuitSessionDetail {
  state: "current" | "last" | "unavailable";
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

export interface CircuitDetailModel {
  circuitId: string;
  title: string;
  entityId: string;
  status: CircuitRuntimeStatus;
  session: CircuitSessionDetail;
  recentActivity: CircuitActivityEvent[];
  entityName: string;
}

export interface CircuitHistoryPoint {
  timestamp: number;
  power: number;
}

export function formatCircuitDuration(duration?: number): string {
  if (duration === undefined) return "Unavailable";
  if (duration < 60_000) return "< 1 min";
  const minutes = Math.round(duration / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}
