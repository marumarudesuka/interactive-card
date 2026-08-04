import type { FormattedMetric, MetricFormatOptions, MetricInput } from "../types/metric";
import { formatNumber } from "./number-formatter.ts";
import { convertUnit } from "./unit-converter.ts";

function preserveDisplayUnitBoundary(
  value: number,
  unit: string,
  decimals: number
): number {
  if (unit !== "kW" && unit !== "kWh") return value;
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000) return value;

  const rounded = Number(value.toFixed(decimals));
  if (Math.abs(rounded) < 1_000) return value;

  const maximum = 1_000 - 10 ** -decimals;
  return Math.sign(value || 1) * maximum;
}

export function formatMetric(
  input: MetricInput,
  options: MetricFormatOptions = {}
): FormattedMetric {
  const sourceUnit = options.unit ?? input.unit;

  if (input.status !== "valid" || input.value === null) {
    return {
      value: "--",
      unit: sourceUnit,
      status: input.status,
      rawValue: input.value,
    };
  }

  const converted = convertUnit(input.value, sourceUnit, {
    autoScale: options.autoScale,
  });
  const decimals = options.decimals ?? 2;
  const displayValue = preserveDisplayUnitBoundary(
    converted.value,
    converted.unit,
    decimals
  );

  return {
    value: formatNumber(displayValue, {
      decimals,
      trimTrailingZeros: options.trimTrailingZeros,
      useGrouping: options.useGrouping,
    }),
    unit: converted.unit,
    status: input.status,
    rawValue: input.value,
  };
}
