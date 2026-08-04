export interface NumberFormatOptions {
  decimals?: number;
  trimTrailingZeros?: boolean;
  useGrouping?: boolean;
}

function normalizeDecimals(decimals: number): number {
  if (!Number.isFinite(decimals)) return 2;
  return Math.min(20, Math.max(0, Math.trunc(decimals)));
}

export function formatNumber(
  value: number,
  options: NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) return "--";

  const decimals = normalizeDecimals(options.decimals ?? 2);
  let formatted = value.toFixed(decimals);

  if (options.trimTrailingZeros && formatted.includes(".")) {
    formatted = formatted.replace(/\.?0+$/, "");
  }

  if (!options.useGrouping) return formatted;

  const [integer, fraction] = formatted.split(".");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined
    ? groupedInteger
    : `${groupedInteger}.${fraction}`;
}
