export interface UnitConversionOptions {
  autoScale?: boolean;
}

export interface ConvertedUnitValue {
  value: number;
  unit: string;
  scale: number;
}

export type MetricUnitFamily = "power" | "energy" | "other";

export interface BaseUnitValue {
  value: number;
  unit: string;
  family: MetricUnitFamily;
}

export function convertToBaseUnit(
  value: number,
  unit: string
): BaseUnitValue {
  const normalizedUnit = unit.trim();
  const normalizedPowerUnit = normalizedUnit.replace(/\s+/g, "").toLowerCase();

  if (normalizedPowerUnit === "mw") {
    return { value: value * 1_000_000, unit: "W", family: "power" };
  }
  if (normalizedPowerUnit === "kw") {
    return { value: value * 1_000, unit: "W", family: "power" };
  }
  if (normalizedPowerUnit === "w") {
    return { value, unit: "W", family: "power" };
  }

  if (normalizedUnit === "MWh") {
    return { value: value * 1_000_000, unit: "Wh", family: "energy" };
  }
  if (normalizedUnit === "kWh") {
    return { value: value * 1_000, unit: "Wh", family: "energy" };
  }
  if (normalizedUnit === "Wh") {
    return { value, unit: "Wh", family: "energy" };
  }

  return {
    value,
    unit: normalizedUnit,
    family: "other",
  };
}

export function convertUnit(
  value: number,
  unit: string,
  options: UnitConversionOptions = {}
): ConvertedUnitValue {
  if (!options.autoScale) {
    return { value, unit, scale: 1 };
  }

  const absoluteValue = Math.abs(value);

  if (unit === "W") {
    if (absoluteValue >= 1_000_000) {
      return { value: value / 1_000_000, unit: "MW", scale: 1_000_000 };
    }

    if (absoluteValue >= 1_000) {
      return { value: value / 1_000, unit: "kW", scale: 1_000 };
    }
  }

  if (unit === "kW" && absoluteValue >= 1_000) {
    return { value: value / 1_000, unit: "MW", scale: 1_000 };
  }

  if (unit === "Wh") {
    if (absoluteValue >= 1_000_000) {
      return { value: value / 1_000_000, unit: "MWh", scale: 1_000_000 };
    }

    if (absoluteValue >= 1_000) {
      return { value: value / 1_000, unit: "kWh", scale: 1_000 };
    }
  }

  if (unit === "kWh" && absoluteValue >= 1_000) {
    return { value: value / 1_000, unit: "MWh", scale: 1_000 };
  }

  return { value, unit, scale: 1 };
}
