import type { TrendCategory } from "../types/trend";

export interface TrendAxisUnitResolution {
  displayUnit: string;
  scale: number;
  tickStep: number;
}

function selectEngineeringStep(
  range: number,
  candidates: readonly number[]
): number {
  const targetStep = Math.max(0, range) / 6;
  return (
    candidates.find((candidate) => candidate >= targetStep) ??
    candidates[candidates.length - 1]
  );
}

function resolvePowerAxis(
  unit: string,
  min: number,
  max: number
): TrendAxisUnitResolution {
  const maxAbsolute = Math.max(Math.abs(min), Math.abs(max));
  const range = Math.abs(max - min);

  if (unit === "W" && maxAbsolute <= 10_000) {
    const candidates =
      maxAbsolute <= 1_000
        ? [50, 100, 200] as const
        : [200, 500, 1_000, 2_000] as const;
    return {
      displayUnit: "W",
      scale: 1,
      tickStep: selectEngineeringStep(range, candidates),
    };
  }

  const scale = unit === "W" ? 1_000 : 1;
  const displayRange = range / scale;
  return {
    displayUnit: unit === "W" ? "kW" : unit,
    scale,
    tickStep: selectEngineeringStep(
      displayRange,
      [0.5, 1, 2, 5, 10, 20, 50]
    ),
  };
}

function resolveGenericAxis(
  unit: string,
  min: number,
  max: number
): TrendAxisUnitResolution {
  const maxAbsolute = Math.max(Math.abs(min), Math.abs(max));
  const useKilo = (unit === "Wh" || unit === "W") && maxAbsolute >= 1_000;
  const scale = useKilo ? 1_000 : 1;
  const displayUnit =
    useKilo && unit === "Wh" ? "kWh" : useKilo ? "kW" : unit;
  const displayRange = Math.abs(max - min) / scale;

  return {
    displayUnit,
    scale,
    tickStep: selectEngineeringStep(
      displayRange,
      [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]
    ),
  };
}

export function resolveTrendAxisUnit(
  category: TrendCategory,
  unit: string,
  min: number,
  max: number
): TrendAxisUnitResolution {
  if (category === "power" || unit === "W" || unit === "kW") {
    return resolvePowerAxis(unit, min, max);
  }
  return resolveGenericAxis(unit, min, max);
}
