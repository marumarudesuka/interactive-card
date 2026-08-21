import type { HomeAssistant } from "custom-card-helpers";
import { formatMetric } from "./metric-formatter.ts";
import { parseNumericEntityState } from "./entity-state-parser.ts";
import type {
  AutomationScenarioStatus,
  AutomationScenarioViewModel,
  AutomationStatusPresentation,
  AutomationStrategyPresentation,
  EnergyAutomationCardConfig,
} from "../types/automation-scenario.ts";

const STATUS_PRESENTATIONS: Record<AutomationScenarioStatus, AutomationStatusPresentation> = {
  running: { status:"running", label:"Running", icon:"mdi:play-circle", tone:"success" },
  waiting: { status:"waiting", label:"Waiting", icon:"mdi:clock-outline", tone:"waiting" },
  scheduled: { status:"scheduled", label:"Scheduled", icon:"mdi:calendar-clock", tone:"waiting" },
  completed: { status:"completed", label:"Completed", icon:"mdi:check-circle", tone:"complete" },
  paused: { status:"paused", label:"Paused", icon:"mdi:pause-circle", tone:"paused" },
  blocked: { status:"blocked", label:"Blocked", icon:"mdi:alert-circle", tone:"blocked" },
  disabled: { status:"disabled", label:"Disabled", icon:"mdi:power", tone:"disabled" },
  unknown: { status:"unknown", label:"Unavailable", icon:"mdi:help-circle", tone:"disabled" },
};

export function normalizeAutomationStatus(value: unknown): AutomationScenarioStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  const aliases: Record<string, AutomationScenarioStatus> = {
    charging:"running",
    heating:"running",
    active:"running",
    idle:"waiting",
    scheduled:"scheduled",
    ready:"completed",
    complete:"completed",
    error:"blocked",
    unavailable:"unknown",
    off:"disabled",
  };
  if (aliases[normalized]) return aliases[normalized];
  return normalized in STATUS_PRESENTATIONS
    ? normalized as AutomationScenarioStatus
    : "unknown";
}

export function resolveAutomationStatus(value: unknown): AutomationStatusPresentation {
  return STATUS_PRESENTATIONS[normalizeAutomationStatus(value)];
}

export function resolveAutomationStrategy(value: unknown): AutomationStrategyPresentation {
  const label = String(value ?? "").trim() || "Not set";
  switch (label.toLowerCase()) {
    case "solar":
      return { label, icon:"mdi:white-balance-sunny", tone:"solar" };
    case "grid":
      return { label, icon:"mdi:transmission-tower", tone:"grid" };
    case "wait":
      return { label, icon:"mdi:clock-outline", tone:"wait" };
    default:
      return { label, icon:"mdi:tune-variant", tone:"neutral" };
  }
}

function getState(hass: HomeAssistant | undefined, entityId?: string): string {
  if (!hass || !entityId) return "";
  const value = hass.states[entityId]?.state?.trim();
  return value === "unknown" || value === "unavailable" ? "" : value ?? "";
}

function isOn(hass: HomeAssistant | undefined, entityId?: string): boolean {
  return getState(hass, entityId).toLowerCase() === "on";
}

function hasAvailableState(hass: HomeAssistant | undefined, entityId?: string): boolean {
  return Boolean(hass && entityId && getState(hass, entityId));
}

function formatStateLabel(value: string): string {
  if (!value) return "Unavailable";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string): string {
  if (!value) return "Not available";
  const timeOnly = value.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnly) return `${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour:"2-digit",
    minute:"2-digit",
  }).format(date);
}

function isMeaningfulTime(value: string): boolean {
  return Boolean(value) && !/^0{1,2}:00(?::00)?$/.test(value.trim());
}

function formatLastChanged(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour:"2-digit",
    minute:"2-digit",
  }).format(date);
}

function getFallbackReason(status: AutomationScenarioStatus): string {
  switch (status) {
    case "running": return "Automation is actively managing this scenario";
    case "waiting": return "Waiting for the next suitable opportunity";
    case "scheduled": return "The next action has been scheduled";
    case "completed": return "The planned automation has finished";
    case "paused": return "Automatic actions are temporarily paused";
    case "blocked": return "Automation needs attention before it can continue";
    case "disabled": return "Automatic control is currently turned off";
    case "unknown": return "Waiting for Home Assistant status";
  }
}

export function resolveAutomationScenario(
  hass: HomeAssistant | undefined,
  config: EnergyAutomationCardConfig
): AutomationScenarioViewModel {
  const device = hass?.states[config.device_entity];
  const deviceState = getState(hass, config.device_entity);
  const deviceAvailable = Boolean(deviceState);
  const deviceOn = isOn(hass, config.device_entity);
  const power = config.power_entity
    ? formatMetric(parseNumericEntityState(hass, config.power_entity), {
        autoScale:true,
        decimals:1,
        trimTrailingZeros:true,
      })
    : undefined;
  const temperature = config.temperature_entity
    ? formatMetric(parseNumericEntityState(hass, config.temperature_entity), {
        decimals:1, trimTrailingZeros:true,
      })
    : undefined;
  const targetTemperature = config.target_temperature_entity
    ? formatMetric(parseNumericEntityState(hass, config.target_temperature_entity), {
        decimals:1, trimTrailingZeros:true,
      })
    : undefined;
  const explicitLastAction = getState(hass, config.last_action_entity);
  const status = resolveAutomationStatus(getState(hass, config.status_entity));
  const strategyState = getState(hass, config.strategy_entity);
  const targetState = getState(hass, config.target_time_entity);
  const estimatedFinishState = getState(hass, config.estimated_finish_entity);

  return {
    title:config.title?.trim() || "Automation Scenario",
    icon:config.icon?.trim() || "mdi:white-balance-sunny",
    status,
    strategy:resolveAutomationStrategy(strategyState),
    reason:getState(hass, config.reason_entity) || getFallbackReason(status.status),
    targetTime:formatTime(targetState),
    estimatedFinish:formatTime(estimatedFinishState),
    deviceName:config.device_name?.trim() ||
      String(device?.attributes.friendly_name ?? ""),
    deviceStateLabel:formatStateLabel(deviceState),
    deviceAvailable,
    deviceOn,
    powerValue:power?.value ?? "--",
    powerUnit:power?.unit ?? "",
    temperatureValue:temperature?.value ?? "--",
    temperatureUnit:temperature?.unit ?? "",
    targetTemperatureValue:targetTemperature?.value ?? "",
    manualOverride:isOn(hass, config.manual_override_entity),
    manualOverrideAvailable:hasAvailableState(hass, config.manual_override_entity),
    strategyAvailable:Boolean(strategyState),
    targetAvailable:isMeaningfulTime(targetState),
    nextActionAvailable:isMeaningfulTime(estimatedFinishState) || isMeaningfulTime(targetState),
    lastActionAvailable:Boolean(explicitLastAction || deviceAvailable),
    automationEnabled:config.automation_entity
      ? isOn(hass, config.automation_entity)
      : resolveAutomationStatus(getState(hass, config.status_entity)).status !== "disabled",
    lastAction:explicitLastAction || (deviceAvailable
      ? deviceOn ? "Started device" : "Stopped device"
      : "No recent action"),
    lastActionTime:formatLastChanged(
      config.last_action_entity
        ? hass?.states[config.last_action_entity]?.last_changed
        : device?.last_changed
    ),
  };
}
