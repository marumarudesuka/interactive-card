import { CORE_IDENTITY_DEFAULTS, CORE_STATUS_MAPPINGS, CORE_VISIBILITY_DEFAULTS, normalizeLifecycleStateKey } from "./automation-defaults.ts";
import { adaptLegacyAutomationConfig, isLegacyAutomationConfig } from "./automation-legacy-adapter.ts";
import type { AutomationGroupConfig, AutomationPlanConfig, AutomationScenarioConfig, EnergyAutomationSectionConfig, LinkedAutomationConfig, NormalizedAutomationScenarioConfig, NormalizedEnergyAutomationSectionConfig, ScenarioActionConfig, ScenarioGoalConfig, ScenarioMetricConfig, ScenarioSettingConfig } from "./automation-scenario.types.ts";
import { automationTemplateRegistry, type AutomationTemplateRegistry } from "./automation-template-registry.ts";
import { canonicalAutomationEntityId } from "./automation-entity-identity.ts";

export class AutomationConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "AutomationConfigValidationError";
    this.issues = issues;
  }
}

export interface AutomationConfigNormalizationResult {
  config: NormalizedAutomationScenarioConfig;
  migratedLegacy: boolean;
  warnings: string[];
}

function nonEmpty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }

function validateGoal(goal: ScenarioGoalConfig | undefined, name: string, issues: string[]): void {
  if (goal && !nonEmpty(goal.entity)) issues.push(`${name} requires entity`);
}

function validateMetrics(metrics: ScenarioMetricConfig[] | undefined, issues: string[]): void {
  if (metrics !== undefined && !Array.isArray(metrics)) { issues.push("metrics must be an array"); return; }
  metrics?.forEach((metric, index) => {
    if (!metric || typeof metric !== "object" || !nonEmpty(metric.entity)) issues.push(`metrics[${index}] requires entity`);
  });
}

function validateActions(actions: ScenarioActionConfig[] | undefined, issues: string[]): void {
  if (actions !== undefined && !Array.isArray(actions)) { issues.push("actions must be an array"); return; }
  actions?.forEach((action, index) => {
    if (!action || typeof action !== "object" || !nonEmpty(action.id)) issues.push(`actions[${index}] requires id`);
    if (action?.service && action.script_entity) issues.push(`actions[${index}] cannot configure both service and script_entity`);
    if (!action?.service && !action?.script_entity) issues.push(`actions[${index}] requires service or script_entity`);
    if (action?.service && !/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(action.service)) issues.push(`actions[${index}] service must use domain.service`);
    if (action?.service && !nonEmpty(action.target_entity)) issues.push(`actions[${index}] requires target_entity`);
  });
}

function validateStableIds<T extends { id: string }>(items: T[] | undefined, path: string, issues: string[]): void {
  if (items === undefined) return;
  if (!Array.isArray(items)) { issues.push(`${path} must be an array`); return; }
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = item?.id?.trim();
    if (!id) issues.push(`${path}[${index}] requires id`);
    else if (seen.has(id)) issues.push(`${path} contains duplicate id: ${id}`);
    else seen.add(id);
  });
}

function validateSettings(settings: ScenarioSettingConfig[] | undefined, issues: string[]): void {
  validateStableIds(settings, "settings", issues);
  settings?.forEach((setting, index) => {
    if (!nonEmpty(setting.entity)) issues.push(`settings[${index}] requires entity`);
    if (setting.scope && setting.scope !== "scenario" && setting.scope !== "device") issues.push(`settings[${index}].scope must be scenario or device`);
    if (setting.role && !["scenario","device","observed","manual_override"].includes(setting.role)) issues.push(`settings[${index}].role is invalid`);
    if (setting.change_mode && setting.change_mode !== "direct" && setting.change_mode !== "next_run") {
      issues.push(`settings[${index}].change_mode must be direct or next_run`);
    }
    if (setting.change_mode === "next_run") {
      if (!nonEmpty(setting.override?.value_entity)) issues.push(`settings[${index}] next_run requires override.value_entity`);
      if (!nonEmpty(setting.override?.active_entity)) issues.push(`settings[${index}] next_run requires override.active_entity`);
      const regularDomain=setting.entity?.split(".",1)[0];
      const overrideDomain=setting.override?.value_entity?.split(".",1)[0];
      if (regularDomain && overrideDomain && regularDomain !== overrideDomain) {
        issues.push(`settings[${index}].override.value_entity must use the ${regularDomain} domain`);
      }
      if (setting.override?.active_entity && !setting.override.active_entity.startsWith("input_boolean.")) {
        issues.push(`settings[${index}].override.active_entity must use the input_boolean domain`);
      }
    }
  });
}

function validateLinkedAutomation(automation: LinkedAutomationConfig, path: string, issues: string[]): void {
  if (!nonEmpty(automation.entity)) issues.push(`${path} requires entity`);
  validateStableIds(automation.parameters, `${path}.parameters`, issues);
  automation.parameters?.forEach((parameter, index) => {
    if (!nonEmpty(parameter.entity)) issues.push(`${path}.parameters[${index}] requires entity`);
  });
  for (const [name, binding] of [["current",automation.current],["next",automation.next],["last",automation.last]] as const) {
    if (binding && !nonEmpty(binding.entity)) issues.push(`${path}.${name} requires entity`);
  }
  if (automation.device && !nonEmpty(automation.device.entity)) issues.push(`${path}.device requires entity`);
  if (automation.editor_target && !nonEmpty(automation.editor_target.automation_config_id)) {
    issues.push(`${path}.editor_target requires automation_config_id`);
  }
  validateActions(automation.quick_actions, issues);
}

function validateAutomationGroups(groups: AutomationGroupConfig[] | undefined, issues: string[]): void {
  validateStableIds(groups, "automation_groups", issues);
  const automationIds = new Set<string>();
  groups?.forEach((group, groupIndex) => {
    if (!nonEmpty(group.label)) issues.push(`automation_groups[${groupIndex}] requires label`);
    validateStableIds(group.automations, `automation_groups[${groupIndex}].automations`, issues);
    group.automations?.forEach((automation, automationIndex) => {
      if (automation.id?.trim()) {
        if (automationIds.has(automation.id.trim())) issues.push(`automation_groups contains duplicate automation id: ${automation.id.trim()}`);
        automationIds.add(automation.id.trim());
      }
      validateLinkedAutomation(automation, `automation_groups[${groupIndex}].automations[${automationIndex}]`, issues);
    });
  });
}

function stableId(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"");
  return normalized || fallback;
}

function collapseVisibility(config: NormalizedAutomationScenarioConfig): void {
  if (!config.goals.length) config.visibility.goals = false;
  if (!config.goals.some((goal) => goal.id === "primary")) config.visibility.primary_goal = false;
  if (!config.goals.some((goal) => goal.id === "secondary")) config.visibility.secondary_goal = false;
  if (!config.strategy) config.visibility.strategy = false;
  if (!config.metrics.some((metric) => metric.visible !== false)) config.visibility.metrics = false;
  if (!config.execution) { config.visibility.execution = false; config.visibility.device_control = false; }
  else if (!config.execution.control) config.visibility.device_control = false;
  if (!config.manualOverrideEntity) config.visibility.manual_override = false;
  if (!config.plan?.steps?.length) config.visibility.plan = false;
  if (!config.explanation.reason_entity && !config.reasonEntity) config.visibility.reason = false;
  if (!config.explanation.next_action_entity) config.visibility.next_action = false;
  if (!config.explanation.last_action_entity) config.visibility.last_action = false;
  if (!config.actions.length) config.visibility.controls = false;
}

export function normalizeAutomationScenarioConfig(
  raw: AutomationScenarioConfig | unknown,
  registry: AutomationTemplateRegistry = automationTemplateRegistry
): AutomationConfigNormalizationResult {
  const migratedLegacy = isLegacyAutomationConfig(raw);
  const input = migratedLegacy ? adaptLegacyAutomationConfig(raw) : raw as AutomationScenarioConfig;
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== "object") throw new AutomationConfigValidationError(["Automation Scenario requires a configuration"]);
  if (!nonEmpty(input.status_entity)) issues.push("missing status_entity");

  const requestedTemplate = input.template ?? "custom";
  if (!registry.has(requestedTemplate)) issues.push(`unknown template: ${requestedTemplate}`);
  const template = registry.getOrCustom(requestedTemplate);
  validateGoal(input.goal, "goal", issues);
  validateGoal(input.secondary_goal, "secondary_goal", issues);
  if (input.execution && !nonEmpty(input.execution.entity)) issues.push("execution requires entity");
  if (input.execution?.control && input.execution.control.type !== "switch") issues.push("execution control type must be switch");
  validateMetrics(input.metrics, issues);
  if(input.dashboard?.highlights!==undefined){
    if(!Array.isArray(input.dashboard.highlights)) issues.push("dashboard.highlights must be an array");
    else if(input.dashboard.highlights.length<1||input.dashboard.highlights.length>3) issues.push("dashboard.highlights must contain 1 to 3 items");
    else if(input.dashboard.highlights.some(item=>!nonEmpty(item))) issues.push("dashboard.highlights requires non-empty references");
  }
  validateActions(input.actions, issues);
  validateSettings(input.settings, issues);
  validateAutomationGroups(input.automation_groups, issues);
  if (issues.length) throw new AutomationConfigValidationError(issues);

  const identity = {
    ...CORE_IDENTITY_DEFAULTS,
    ...template.identityDefaults,
    ...input.identity,
    ...(input.title !== undefined ? { title:input.title } : {}),
    ...(input.subtitle !== undefined ? { subtitle:input.subtitle } : {}),
    ...(input.icon !== undefined ? { icon:input.icon } : {}),
  };
  const strategyInput = input.strategy ?? (input.strategy_entity ? { entity:input.strategy_entity } : undefined);
  const strategy = strategyInput ? { ...strategyInput,entity:canonicalAutomationEntityId(strategyInput.entity) } : undefined;
  const goals = [
    input.goal ? { ...input.goal, id:"primary" as const } : undefined,
    input.secondary_goal ? { ...input.secondary_goal, id:"secondary" as const } : undefined,
  ].filter((goal): goal is ScenarioGoalConfig & { id:"primary" | "secondary" } => Boolean(goal));
  const explanation = {
    reason_entity:input.reason_entity,
    next_action_entity:input.next_action_entity,
    last_action_entity:input.last_action_entity,
    ...input.explanation,
    decision_context:input.explanation?.decision_context ? {
      ...input.explanation.decision_context,
      summary_entity:input.explanation.decision_context.summary_entity ? canonicalAutomationEntityId(input.explanation.decision_context.summary_entity) : undefined,
      factors:input.explanation.decision_context.factors?.map(factor=>({...factor,entity:canonicalAutomationEntityId(factor.entity)})),
      observed_entity:input.explanation.decision_context.observed_entity ? canonicalAutomationEntityId(input.explanation.decision_context.observed_entity) : undefined,
      threshold_entity:input.explanation.decision_context.threshold_entity ? canonicalAutomationEntityId(input.explanation.decision_context.threshold_entity) : undefined,
      message_entity:input.explanation.decision_context.message_entity ? canonicalAutomationEntityId(input.explanation.decision_context.message_entity) : undefined,
    } : undefined,
  };
  const plan=(input.plan ?? template.planDefaults) as AutomationPlanConfig|undefined;
  const config: NormalizedAutomationScenarioConfig = {
    type:"custom:energy-automation-card",
    id:stableId(input.id, stableId(input.status_entity, requestedTemplate)),
    visible:input.visible !== false,
    templateId:template.id,
    identity,
    statusEntity:canonicalAutomationEntityId(input.status_entity),
    reasonEntity:input.reason_entity,
    automationEntity:input.automation_entity,
    goals,
    strategy,
    metrics:(input.metrics ?? []).filter((metric) => metric.visible !== false),
    dashboard:input.dashboard?.highlights ? {highlights:[...new Set(input.dashboard.highlights.map(item=>item.trim()))].slice(0,3)} : undefined,
    execution:input.execution ? { ...input.execution,entity:canonicalAutomationEntityId(input.execution.entity) } : undefined,
    manualOverrideEntity:input.manual_override_entity ? canonicalAutomationEntityId(input.manual_override_entity) : undefined,
    plan:plan ? {...plan,current_step_entity:plan.current_step_entity?canonicalAutomationEntityId(plan.current_step_entity):undefined,steps:plan.steps?.map(step=>({...step,status_entity:step.status_entity?canonicalAutomationEntityId(step.status_entity):undefined,detail_entity:step.detail_entity?canonicalAutomationEntityId(step.detail_entity):undefined}))} : undefined,
    explanation,
    progress:input.progress ? {...input.progress,mode:input.progress.mode==="threshold"?"threshold":"target",min:Number.isFinite(input.progress.min)?input.progress.min:undefined,max:Number.isFinite(input.progress.max)?input.progress.max:undefined,current_entity:input.progress.current_entity ? canonicalAutomationEntityId(input.progress.current_entity) : undefined,target_entity:input.progress.target_entity ? canonicalAutomationEntityId(input.progress.target_entity) : undefined,estimated_entity:input.progress.estimated_entity ? canonicalAutomationEntityId(input.progress.estimated_entity) : undefined} : undefined,
    nextDecision:input.next_decision ? {...input.next_decision,time_entity:input.next_decision.time_entity ? canonicalAutomationEntityId(input.next_decision.time_entity) : undefined,label_entity:input.next_decision.label_entity ? canonicalAutomationEntityId(input.next_decision.label_entity) : undefined,condition_entity:input.next_decision.condition_entity ? canonicalAutomationEntityId(input.next_decision.condition_entity) : undefined} : undefined,
    actions:(input.actions ?? []).map((action) => ({ ...action,
      target_entity:action.target_entity ? canonicalAutomationEntityId(action.target_entity) : undefined,
      script_entity:action.script_entity ? canonicalAutomationEntityId(action.script_entity) : undefined,
    })),
    settings:(input.settings ?? []).map((setting) => ({
      ...setting,
      id:setting.id.trim(),
      entity:canonicalAutomationEntityId(setting.entity),
      control:setting.control ?? "auto",
      change_mode:setting.change_mode ?? "direct",
      override:setting.override ? {
        value_entity:canonicalAutomationEntityId(setting.override.value_entity),
        active_entity:canonicalAutomationEntityId(setting.override.active_entity),
      } : undefined,
    })),
    automationGroups:(input.automation_groups ?? []).map((group) => ({
      ...group,
      id:group.id.trim(),
      label:group.label.trim(),
      automations:group.automations.map((automation) => ({
        ...automation,
        id:automation.id.trim(),
        entity:canonicalAutomationEntityId(automation.entity),
        enabled_entity:automation.enabled_entity ? canonicalAutomationEntityId(automation.enabled_entity) : undefined,
        device:automation.device ? { ...automation.device,entity:canonicalAutomationEntityId(automation.device.entity) } : undefined,
        current:automation.current ? {...automation.current,entity:canonicalAutomationEntityId(automation.current.entity)} : undefined,
        next:automation.next ? {...automation.next,entity:canonicalAutomationEntityId(automation.next.entity)} : undefined,
        last:automation.last ? {...automation.last,entity:canonicalAutomationEntityId(automation.last.entity)} : undefined,
        parameters:automation.parameters?.map((parameter) => ({ ...parameter, id:parameter.id.trim(), entity:canonicalAutomationEntityId(parameter.entity) })),
        quick_actions:automation.quick_actions?.map((action) => ({ ...action, id:action.id.trim(),target_entity:action.target_entity ? canonicalAutomationEntityId(action.target_entity) : undefined,script_entity:action.script_entity ? canonicalAutomationEntityId(action.script_entity) : undefined })),
      })),
    })),
    statusMappings:Object.fromEntries(Object.entries({ ...CORE_STATUS_MAPPINGS, ...template.statusMappings, ...input.status_mappings }).map(([key,value]) => [normalizeLifecycleStateKey(key),value])),
    strategyMappings:{ ...template.strategyMappings, ...input.strategy_mappings, ...strategy?.mappings },
    visibility:{ ...CORE_VISIBILITY_DEFAULTS, ...template.visibilityDefaults, ...input.show },
  };
  collapseVisibility(config);
  if (migratedLegacy) warnings.push("Legacy automation card configuration was normalized without changing the source YAML");
  return { config, migratedLegacy, warnings };
}

export function normalizeAutomationSectionConfig(
  raw: EnergyAutomationSectionConfig | unknown,
  registry: AutomationTemplateRegistry = automationTemplateRegistry
): NormalizedEnergyAutomationSectionConfig {
  if (!raw || typeof raw !== "object") {
    throw new AutomationConfigValidationError(["Automation Section requires a configuration"]);
  }
  const input = raw as EnergyAutomationSectionConfig;
  if (!Array.isArray(input.scenarios)) {
    throw new AutomationConfigValidationError(["scenarios must be an array"]);
  }
  const scenarios = input.scenarios.map((scenario) =>
    normalizeAutomationScenarioConfig(scenario,registry).config);
  const ids = new Set<string>();
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      throw new AutomationConfigValidationError([`scenarios contains duplicate id: ${scenario.id}`]);
    }
    ids.add(scenario.id);
  }
  return {
    type:"custom:energy-automation-section",
    title:input.title?.trim() || "Automation",
    scenarios,
  };
}
