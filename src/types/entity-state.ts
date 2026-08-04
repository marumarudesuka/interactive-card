export type EntityStateStatus =
  | "valid"
  | "missing"
  | "unknown"
  | "unavailable"
  | "invalid";

export interface ParsedNumericState {
  entityId: string;
  status: EntityStateStatus;
  value: number | null;
  unit: string;
  name: string;
}
