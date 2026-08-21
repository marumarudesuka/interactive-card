import type { NormalizedAutomationScenario, NormalizedScenarioAction, ResolvedAutomationGroup, ResolvedLinkedAutomation, ResolvedScenarioSetting } from "./automation-scenario.types.ts";
import { canonicalAutomationEntityId } from "./automation-entity-identity.ts";

export interface AutomationNavigationItem {
  groupId:string;
  groupLabel:string;
  automation:ResolvedAutomationGroup["automations"][number];
}

export interface AutomationInspectorField { label:string; value:string; }

export function resolveScenarioSettingPresentationControl(
  setting:ResolvedScenarioSetting,
  attributes:Record<string,unknown>|undefined
):ResolvedScenarioSetting["control"] {
  if (setting.control !== "datetime") return setting.control;
  return attributes?.has_time === true && attributes?.has_date === false ? "time" : "datetime";
}

export function getAutomationParticipation(groups:readonly ResolvedAutomationGroup[]) {
  const automations = groups.flatMap((group) => group.automations);
  const available = automations.filter((automation) => automation.enabledAvailable);
  const enabled = available.filter((automation) => automation.enabled).length;
  return {
    header:available.length ? enabled > 0 ? "Active" : "Inactive" : "Unavailable",
    summary:available.length ? `${enabled} enabled` : "Unavailable",
  };
}

function stableActionData(value:unknown):string {
  if (Array.isArray(value)) return `[${value.map(stableActionData).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string,unknown>)
    .sort(([left],[right]) => left.localeCompare(right))
    .map(([key,item]) => `${JSON.stringify(key)}:${stableActionData(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "";
}

export function getAutomationActionPresentationKey(action:NormalizedScenarioAction):string {
  const service = action.service?.trim() || (action.script_entity ? "script.turn_on" : "");
  const target = canonicalAutomationEntityId(action.target_entity || action.script_entity);
  return `${service}|${target}|${stableActionData(action.data ?? {})}`;
}

export function getPresentedAutomationQuickActions(
  automation:ResolvedLinkedAutomation,
  preferredActions:readonly NormalizedScenarioAction[] = [],
  controlledEntityIds:readonly string[] = []
) {
  const preferredKeys = new Set(preferredActions.map(getAutomationActionPresentationKey));
  const controlledEntities = new Set(controlledEntityIds.map(canonicalAutomationEntityId));
  return automation.quickActions.filter((action) => !(
    (action.service === "automation.turn_on" || action.service === "automation.turn_off") &&
    canonicalAutomationEntityId(action.target_entity) === canonicalAutomationEntityId(automation.entityId)
  ) && !controlledEntities.has(canonicalAutomationEntityId(action.target_entity ?? action.script_entity)) &&
    !preferredKeys.has(getAutomationActionPresentationKey(action)));
}

export function getPresentedScenarioActions(
  actions:readonly NormalizedScenarioAction[],
  controlledEntityIds:readonly string[] = []
):NormalizedScenarioAction[] {
  const controlledEntities = new Set(controlledEntityIds.map(canonicalAutomationEntityId));
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (controlledEntities.has(canonicalAutomationEntityId(action.target_entity ?? action.script_entity))) return false;
    const key = getAutomationActionPresentationKey(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getPrimaryScenarioSettings(
  settings:readonly ResolvedScenarioSetting[]
):ResolvedScenarioSetting[] {
  const seen = new Set<string>();
  return settings.filter((setting) => {
    const entityId=canonicalAutomationEntityId(setting.entityId);
    if (!entityId || seen.has(entityId)) return false;
    seen.add(entityId);
    return true;
  });
}

export function getScenarioExecutionSetting(
  scenario:NormalizedAutomationScenario
):ResolvedScenarioSetting|undefined {
  const execution=scenario.execution;
  if (!execution?.control || execution.control.type !== "switch") return undefined;
  return {
    id:`execution:${canonicalAutomationEntityId(execution.entityId)}`,
    entityId:canonicalAutomationEntityId(execution.entityId),
    label:execution.label,
    value:execution.stateLabel,
    available:execution.tone !== "critical",
    rawValue:execution.rawState,
    regularValue:execution.stateLabel,
    regularRawValue:execution.rawState,
    regularAvailable:execution.tone !== "critical",
    effectiveValue:execution.stateLabel,
    effectiveRawValue:execution.rawState,
    overrideActive:false,
    overrideAvailable:false,
    overrideState:"not_configured",
    control:"toggle",
    changeMode:"direct",
    role:"device",
  };
}

export function getAssociatedDeviceSettings(
  scenario:NormalizedAutomationScenario
):ResolvedScenarioSetting[] {
  const supportedActuatorDomains=new Set(["switch","input_boolean","climate","fan","light","water_heater","cover"]);
  const seen=new Set<string>();
  return scenario.automationGroups.flatMap(group=>{
    const hasExplicitGroupOperation=scenario.actions.some(action=>action.group_id===group.id) || group.automations.some(automation=>(automation.quickActions?.length??0)>0);
    if (hasExplicitGroupOperation) return [];
    return group.automations.flatMap(automation=>{
      const device=automation.device;
      if (!device) return [];
      const entityId=canonicalAutomationEntityId(device.entityId);
      const domain=entityId.split(".",1)[0];
      if (!entityId||seen.has(entityId)||!supportedActuatorDomains.has(domain)) return [];
      seen.add(entityId);
      const control=domain==="climate"||domain==="water_heater"||domain==="cover"?"unsupported" as const:"toggle" as const;
      const attributes=device.attributes??{};
      const rawState=String(attributes.hvac_action??device.state).toLowerCase();
      return [{id:`associated-device:${entityId}`,entityId,label:device.name,value:device.state,available:device.available,rawValue:rawState,regularValue:device.state,regularRawValue:rawState,regularAvailable:device.available,effectiveValue:device.state,effectiveRawValue:rawState,overrideActive:false,overrideAvailable:false,overrideState:"not_configured" as const,control,changeMode:"direct" as const,role:"device" as const,entityDomain:domain,entityAttributes:attributes}];
    });
  });
}

export function isManualOverrideSetting(
  setting:ResolvedScenarioSetting,
  manualOverrideEntityId = ""
):boolean {
  return setting.role === "manual_override" ||
    setting.id.trim().toLowerCase().replace(/_/g,"-") === "manual-override" ||
    Boolean(manualOverrideEntityId && canonicalAutomationEntityId(setting.entityId) === canonicalAutomationEntityId(manualOverrideEntityId));
}

export function classifyScenarioSettings(
  settings:readonly ResolvedScenarioSetting[],
  groups:readonly ResolvedAutomationGroup[],
  manualOverrideEntityId = "",
  actions:readonly NormalizedScenarioAction[] = []
) {
  const primary = getPrimaryScenarioSettings(settings);
  const manualOverride = primary.find((setting) =>
    isManualOverrideSetting(setting,manualOverrideEntityId));
  const remaining = primary.filter((setting) => setting !== manualOverride);
  const actionEntityIds=new Set([...actions,...groups.flatMap((group)=>group.automations.flatMap((automation)=>automation.quickActions ?? []))]
    .map((action)=>canonicalAutomationEntityId(action.target_entity ?? action.script_entity)).filter(Boolean));
  const presentationSettings=remaining.filter((setting) => {
    const role=getScenarioSettingRole(setting,groups);
    return role === "device" || !actionEntityIds.has(canonicalAutomationEntityId(setting.entityId));
  });
  return {
    scenario:presentationSettings.filter((setting) => getScenarioSettingRole(setting,groups) === "scenario"),
    device:presentationSettings.filter((setting) => isDeviceControlSetting(setting,groups)),
    observed:presentationSettings.filter((setting) => getScenarioSettingRole(setting,groups) === "observed"),
    manualOverride,
  };
}

export function shouldPresentReadOnlyStrategy(
  scenario:NormalizedAutomationScenario,
  strategyEntityId:string
):boolean {
  return Boolean(scenario.strategy && !scenario.settings.some((setting) =>
    strategyEntityId && canonicalAutomationEntityId(setting.entityId) === canonicalAutomationEntityId(strategyEntityId)));
}

export function hasScenarioControlContent(scenario:NormalizedAutomationScenario):boolean {
  return Boolean(scenario.strategy || scenario.settings.length);
}

export function hasScenarioActivityContent(scenario:NormalizedAutomationScenario,hasStatusBinding:boolean):boolean {
  return hasStatusBinding || Object.values(scenario.explanation.bindings)
    .some((binding) => binding.status !== "not_configured");
}

export function isDeviceControlSetting(
  setting:ResolvedScenarioSetting,
  groups:readonly ResolvedAutomationGroup[]
):boolean {
  return getScenarioSettingRole(setting,groups) === "device";
}

export function getScenarioSettingRole(
  setting:ResolvedScenarioSetting,
  groups:readonly ResolvedAutomationGroup[]
):"scenario"|"device"|"observed"|"manual_override"|"unknown" {
  if (setting.role) return setting.role;
  // Compatibility: exact linked-device evidence is stronger than the legacy
  // placement hint. Legacy scope remains supported, but absence of a role and
  // scope is deliberately unknown rather than silently editable.
  const settingEntityId=canonicalAutomationEntityId(setting.entityId);
  const operatesAssociatedDevice = groups.some((group) => group.automations.some(
    (automation) => canonicalAutomationEntityId(automation.device?.entityId) === settingEntityId
  ));
  if (operatesAssociatedDevice || setting.scope === "device") return "device";
  if (setting.scope === "scenario") return "scenario";
  return "unknown";
}

export function selectAutomationInspectorFields(
  automation:ResolvedLinkedAutomation,
  excludedEntityIds:readonly string[],
  limit = 3
):AutomationInspectorField[] {
  const excluded = new Set(excludedEntityIds.map(canonicalAutomationEntityId));
  return [
    automation.current ? { label:"Current",value:automation.current.value } : undefined,
    automation.next ? { label:"Next",value:automation.next.value } : undefined,
    automation.last ? { label:"Last",value:automation.last.value } : undefined,
    automation.device ? { label:"Device",value:automation.device.name } : undefined,
    ...automation.parameters
      .filter((parameter) => !excluded.has(canonicalAutomationEntityId(parameter.entityId)))
      .map((parameter) => ({ label:parameter.label,value:`${parameter.value}${parameter.unit ? ` ${parameter.unit}` : ""}` })),
  ].filter((field):field is AutomationInspectorField => field !== undefined).slice(0,limit);
}

export function flattenAutomationNavigation(
  groups: readonly ResolvedAutomationGroup[]
): AutomationNavigationItem[] {
  return groups.flatMap((group) => group.automations.map((automation) => ({
    groupId:group.id,
    groupLabel:group.label,
    automation,
  })));
}

export function selectAutomationId(
  groups: readonly ResolvedAutomationGroup[],
  currentId = ""
): string {
  const automations = groups.flatMap((group) => group.automations);
  if (automations.some((automation) => automation.id === currentId)) return currentId;
  return automations.find((automation) => automation.available)?.id ?? automations[0]?.id ?? "";
}

export function selectAutomationGroupId(
  groups: readonly ResolvedAutomationGroup[], currentGroupId = ""
): string {
  if (groups.some((group) => group.id === currentGroupId)) return currentGroupId;
  return groups.find((group) => group.automations.some((automation) => automation.available))?.id
    ?? groups[0]?.id ?? "";
}

export function selectGroupAutomationId(
  group: ResolvedAutomationGroup | undefined, currentId = ""
): string {
  if (!group) return "";
  if (group.automations.some((automation) => automation.id === currentId)) return currentId;
  return group.automations.find((automation) => automation.available)?.id
    ?? group.automations[0]?.id ?? "";
}

export function navigateAutomationId(
  groups: readonly ResolvedAutomationGroup[],
  currentId:string,
  direction:-1 | 1
):string {
  const items = flattenAutomationNavigation(groups);
  if (!items.length) return "";
  const currentIndex = items.findIndex((item) => item.automation.id === currentId);
  const start = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (start + direction + items.length) % items.length;
  return items[nextIndex].automation.id;
}

export function navigateGroupAutomationId(
  group: ResolvedAutomationGroup | undefined,
  currentId:string,
  direction:-1 | 1
):string {
  if (!group?.automations.length) return "";
  const currentIndex = group.automations.findIndex((automation) => automation.id === currentId);
  const start = currentIndex >= 0 ? currentIndex : 0;
  return group.automations[(start + direction + group.automations.length) % group.automations.length].id;
}

export function getAutomationScenarioColumnCount(width: number): 1 | 2 | 3 {
  if (width <= 560) return 1;
  if (width <= 920) return 2;
  return 3;
}
