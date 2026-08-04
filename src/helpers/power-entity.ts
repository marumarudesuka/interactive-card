export interface PowerEntityStateLike {
  attributes?: Readonly<Record<string, unknown>>;
}

const POWER_UNITS = new Set(["w", "kw", "mw"]);

/** Normalize only instantaneous power units; energy units remain distinct. */
export function normalizePowerUnit(unit: unknown): "W" | "kW" | "MW" | undefined {
  const normalized = String(unit ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
  if (!POWER_UNITS.has(normalized)) return undefined;
  return normalized === "mw" ? "MW" : normalized === "kw" ? "kW" : "W";
}

export function isRealTimePowerEntity(
  entityId: string,
  state?: PowerEntityStateLike
): boolean {
  if (entityId.split(".", 1)[0].toLowerCase() !== "sensor") return false;
  const deviceClass = String(state?.attributes?.device_class ?? "")
    .trim()
    .toLowerCase();
  const rawUnit = String(state?.attributes?.unit_of_measurement ?? "").trim();
  const unit = normalizePowerUnit(rawUnit);

  // An explicitly declared non-power unit (especially Wh/kWh/MWh) always
  // wins over a malformed device_class so cumulative sensors cannot leak in.
  if (rawUnit) return Boolean(unit);
  return deviceClass === "power";
}
