import type { AutomationScenarioConfig, ScenarioActionConfig, ScenarioMetricConfig } from "./automation-scenario.types.ts";

interface LegacyServiceAction { domain?: string; service?: string; entity_id?: string; data?: Record<string, unknown>; }
interface LegacyAutomationConfig {
  type?: string; title?: string; description?: string; icon?: string; status_entity?: string;
  strategy_entity?: string; reason_entity?: string; target_time_entity?: string;
  manual_override_entity?: string; device_entity?: string; power_entity?: string;
  temperature_entity?: string; target_temperature_entity?: string; automation_entity?: string;
  estimated_finish_entity?: string; last_action_entity?: string; device_name?: string;
  actions?: { pause?: LegacyServiceAction; run_now?: LegacyServiceAction; stop?: LegacyServiceAction };
  show?: { power?: boolean; temperature?: boolean; strategy?: boolean; device?: boolean; next_action?: boolean; last_action?: boolean };
}

export function isLegacyAutomationConfig(config: unknown): config is LegacyAutomationConfig {
  if (!config || typeof config !== "object") return false;
  const value = config as Record<string, unknown>;
  const actions = value.actions && typeof value.actions === "object"
    ? value.actions as Record<string, unknown>
    : undefined;
  const hasLegacyActionShape = Boolean(actions && ["run_now", "pause", "stop"].some((key) => key in actions));
  return ["target_time_entity", "power_entity", "temperature_entity", "target_temperature_entity", "device_name"]
    .some((key) => key in value) || hasLegacyActionShape;
}

function migrateAction(id: "run_now" | "pause" | "stop", action: LegacyServiceAction | undefined, deviceEntity?: string): ScenarioActionConfig {
  const defaults = {
    run_now:{ label:"Run Now", icon:"mdi:play", tone:"primary" as const },
    pause:{ label:"Pause", icon:"mdi:pause", tone:"neutral" as const },
    stop:{ label:"Stop", icon:"mdi:stop", tone:"destructive" as const },
  }[id];
  const service = action?.service
    ? `${action.domain?.trim() || "homeassistant"}.${action.service.trim()}`
    : `homeassistant.${id === "run_now" ? "turn_on" : "turn_off"}`;
  return { id, ...defaults, service, target_entity:action?.entity_id || deviceEntity, data:action?.data };
}

export function adaptLegacyAutomationConfig(legacy: LegacyAutomationConfig): AutomationScenarioConfig {
  const metrics: ScenarioMetricConfig[] = [];
  if (legacy.power_entity) metrics.push({ entity:legacy.power_entity, label:"Current Power", icon:"mdi:flash", format:"power", role:"primary", visible:legacy.show?.power !== false });
  if (legacy.temperature_entity) metrics.push({ entity:legacy.temperature_entity, label:"Water Temperature", icon:"mdi:thermometer", format:"temperature", role:"primary", visible:legacy.show?.temperature !== false });

  const actions = (["run_now", "pause", "stop"] as const)
    .filter((id) => Boolean(legacy.actions?.[id]))
    .map((id) => migrateAction(id, legacy.actions?.[id], legacy.device_entity));

  const automationGroups = legacy.automation_entity ? [{
    id:"automation",
    label:"Automation",
    automations:[{
      id:"primary-automation",
      entity:legacy.automation_entity,
      name:legacy.title,
      description:legacy.description,
      enabled_entity:legacy.automation_entity,
      device:legacy.device_entity ? { entity:legacy.device_entity, name:legacy.device_name } : undefined,
      current:legacy.status_entity ? { entity:legacy.status_entity, label:"Current status" } : undefined,
      next:legacy.estimated_finish_entity ? { entity:legacy.estimated_finish_entity, label:"Next action", format:"datetime" as const } : undefined,
      last:legacy.last_action_entity ? { entity:legacy.last_action_entity, label:"Last action" } : undefined,
      quick_actions:actions,
    }],
  }] : [];

  return {
    id:"legacy-automation-scenario",
    type:"custom:energy-automation-card",
    template:"solar_water_heating",
    identity:{ title:legacy.title, subtitle:legacy.description, icon:legacy.icon },
    status_entity:legacy.status_entity ?? "",
    reason_entity:legacy.reason_entity,
    strategy:legacy.strategy_entity ? { entity:legacy.strategy_entity } : undefined,
    automation_entity:legacy.automation_entity,
    goal:legacy.target_time_entity ? { entity:legacy.target_time_entity, label:"Target Time", icon:"mdi:clock-outline", format:"time" } : undefined,
    secondary_goal:legacy.target_temperature_entity ? { entity:legacy.target_temperature_entity, label:"Target Temperature", icon:"mdi:thermometer", format:"temperature" } : undefined,
    execution:legacy.device_entity ? {
      entity:legacy.device_entity,
      label:legacy.device_name,
      icon:"mdi:heat-pump",
      control:{ type:"switch" },
    } : undefined,
    manual_override_entity:legacy.manual_override_entity,
    metrics,
    explanation:{
      reason_entity:legacy.reason_entity,
      next_action_entity:legacy.estimated_finish_entity,
      last_action_entity:legacy.last_action_entity,
    },
    actions,
    settings:legacy.manual_override_entity ? [{
      id:"manual-override",
      label:"Manual Override",
      entity:legacy.manual_override_entity,
      control:"toggle",
      role:"manual_override",
    }] : [],
    automation_groups:automationGroups,
    show:{
      strategy:legacy.show?.strategy,
      execution:legacy.show?.device,
      next_action:legacy.show?.next_action,
      last_action:legacy.show?.last_action,
      metrics:metrics.some((metric) => metric.visible !== false),
    },
  };
}
