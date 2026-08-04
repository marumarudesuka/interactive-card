import type {
  EntityStateStatus,
  ParsedNumericState,
} from "./entity-state";

export interface MetricFormatOptions {
  unit?: string;
  autoScale?: boolean;
  decimals?: number;
  trimTrailingZeros?: boolean;
  useGrouping?: boolean;
}

export interface FormattedMetric {
  value: string;
  unit: string;
  status: EntityStateStatus;
  rawValue: number | null;
}

export type MetricInput = ParsedNumericState;
