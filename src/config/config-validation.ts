import type { KpiCardConfig } from "./config.types";

export type ConfigValidationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: string };

export function validateKpiCardConfig(
  config: KpiCardConfig
): ConfigValidationResult {
  if (
    config.enabled === true &&
    (typeof config.entity !== "string" || config.entity.trim().length === 0)
  ) {
    return {
      status: "invalid",
      reason: "Entity required",
    };
  }

  return { status: "valid" };
}
