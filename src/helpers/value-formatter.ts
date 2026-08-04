import { formatMetric } from "./metric-formatter.ts";

export interface FormattedValue {
  value: string;
  unit: string;
}

export interface FormatOptions {
  autoScale?: boolean;
  decimals?: number;
  useGrouping?: boolean;
}

/**
 * @deprecated Use formatMetric with a ParsedNumericState instead.
 */
export function formatValue(
  rawValue: number,
  unit: string,
  options: FormatOptions = {}
): FormattedValue {
  if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
    return {
      value: "--",
      unit,
    };
  }

  const autoScale = options.autoScale ?? true;
  let compatibilityValue = rawValue;
  let compatibilityUnit = unit;

  // Preserve the two legacy conversions that the active KPI card never used.
  if (autoScale && unit === "g" && Math.abs(rawValue) >= 1_000) {
    compatibilityValue = rawValue / 1_000;
    compatibilityUnit = "kg";
  } else if (autoScale && unit === "ms" && Math.abs(rawValue) >= 1_000) {
    compatibilityValue = rawValue / 1_000;
    compatibilityUnit = "s";
  }

  const formatted = formatMetric(
    {
      entityId: "",
      status: "valid",
      value: compatibilityValue,
      unit: compatibilityUnit,
      name: "",
    },
    {
      unit: compatibilityUnit,
      autoScale: autoScale && compatibilityUnit === unit,
      decimals: options.decimals ?? 2,
      useGrouping: options.useGrouping,
    }
  );

  return {
    value: formatted.value,
    unit: formatted.unit,
  };
}
