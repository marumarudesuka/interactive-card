import type { AutomationScenarioVisibilityConfig, LifecycleStatus } from "./automation-scenario.types.ts";

export const CORE_STATUS_MAPPINGS: Record<string, LifecycleStatus> = {
  running:"running", waiting:"waiting", scheduled:"scheduled", paused:"paused",
  completed:"completed", blocked:"blocked", disabled:"disabled", unavailable:"unavailable",
  unknown:"unknown", on:"running", off:"disabled",
};

export function normalizeLifecycleStateKey(value:string):string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g,"_");
}

export const CORE_VISIBILITY_DEFAULTS: Required<AutomationScenarioVisibilityConfig> = {
  identity:true, lifecycle:true, goals:true, primary_goal:true, secondary_goal:true,
  strategy:true, metrics:true, execution:true, device_control:true, manual_override:true,
  plan:true, explanation:true, reason:true, next_action:true, last_action:true,
  decision_factors:false, controls:true,
};

export const CORE_IDENTITY_DEFAULTS = {
  title:"Automation Scenario", subtitle:"", icon:"mdi:robot-outline",
};
