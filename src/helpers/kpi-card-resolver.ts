import type { HomeAssistant } from "custom-card-helpers";

import type { KpiCardConfig } from "../config/config.types";
import type { EntityStateStatus } from "../types/entity-state";
import { getAttribute, getEntity, getNumber } from "./entity.ts";
import { parseNumericEntityState } from "./entity-state-parser.ts";
import { formatValue } from "./value-formatter.ts";

export interface KpiMetricViewModel {
  value: string;
  unit: string;
  status: EntityStateStatus;
  rawValue: number | null;
  statusMessage?: string;
}

export interface KpiTrendViewModel {
  text: string;
  color: string;
}

function resolveStatusMessage(status: EntityStateStatus): string {
  switch (status) {
    case "unknown":
      return "Entity state is unknown";
    case "unavailable":
      return "Entity is unavailable";
    case "invalid":
      return "Entity state is invalid";
    case "missing":
      return "Entity not found";
    default:
      return "";
  }
}

function isComparisonKpi(config: KpiCardConfig): boolean {
  const id = (config.id ?? "").toLowerCase();
  const title = (config.title ?? "").toLowerCase();

  return (
    config.category === "cost" ||
    id === "usage" ||
    id.includes("today") ||
    id.includes("daily") ||
    id.includes("consumption") ||
    title.includes("today") ||
    title.includes("daily") ||
    title.includes("consumption") ||
    title.includes("cost")
  );
}

export function resolveKpiMetricViewModel(
  hass: HomeAssistant | undefined,
  config: KpiCardConfig
): KpiMetricViewModel | null {
  if (!hass || !config?.entity) {
    return null;
  }

  const state = parseNumericEntityState(hass, config.entity);
  if (state.status !== "valid" || state.value === null) {
    return {
      value: "--",
      unit: state.unit || config.unit || "",
      status: state.status,
      rawValue: null,
      statusMessage: resolveStatusMessage(state.status),
    };
  }

  const formatted = formatValue(
    state.value,
    state.unit || config.unit || "",
    {
      autoScale: config.autoScale ?? true,
      decimals: config.decimals ?? config.precision ?? 2,
    }
  );

  return {
    value: formatted.value,
    unit: formatted.unit,
    status: state.status,
    rawValue: state.value,
  };
}

export function resolveKpiTrendViewModel(
  hass: HomeAssistant | undefined,
  config: KpiCardConfig
): KpiTrendViewModel {
  const subtitle = config.subtitle ?? config.trend ?? "";
  const fallback = {
    text: subtitle,
    color: "var(--secondary-text-color)",
  };

  if (!subtitle && !config.trendMode) {
    return fallback;
  }

  if (config.trendMode === "none") {
    return fallback;
  }

  if (!hass || !config?.entity) {
    return fallback;
  }

  const entity = getEntity(hass, config.entity);
  if (!entity) {
    return fallback;
  }

  const comparisonKpi = isComparisonKpi(config);
  const today = Number(entity.state);
  const yesterday = Number(
    getAttribute(hass, config.entity, "last_period")
  );

  if (!comparisonKpi || !yesterday || Number.isNaN(yesterday)) {
    return fallback;
  }

  const change = ((today - yesterday) / yesterday) * 100;
  const value = Math.abs(change).toFixed(1);

  if (change > 0) {
    return {
      text: `↑ ${value}% vs yesterday`,
      color: "#FF3B30",
    };
  }

  if (change < 0) {
    return {
      text: `↓ ${value}% vs yesterday`,
      color: "var(--en-color-success)",
    };
  }

  return fallback;
}

export function resolveKpiSparklineData(
  hass: HomeAssistant | undefined,
  config: KpiCardConfig
): number[] {
  if (Array.isArray(config?.history) && config.history.length) {
    return config.history
      .map((value: unknown) => Number(value))
      .filter((value: number) => !Number.isNaN(value));
  }

  if (!hass || !config?.entity) {
    return [];
  }

  const today = Number(getNumber(hass, config.entity));
  const yesterday = Number(
    getAttribute(hass, config.entity, "last_period")
  );
  const values: number[] = [];

  if (!Number.isNaN(yesterday)) {
    values.push(yesterday);
  }

  if (!Number.isNaN(today)) {
    values.push(today);
  }

  return values;
}
