import type { HomeAssistant } from "custom-card-helpers";
import { parseNumericEntityState } from "../helpers/entity-state-parser.ts";
import { formatMetric } from "../helpers/metric-formatter.ts";
import { convertToBaseUnit } from "../helpers/unit-converter.ts";
import { resolveAutomationActionCall } from "./automation-action-executor.ts";
import { normalizeLifecycleStateKey } from "./automation-defaults.ts";
import { canonicalAutomationEntityId } from "./automation-entity-identity.ts";
import type {
  LifecycleStatus,
  NormalizedAutomationPlan,
  NormalizedAutomationScenario,
  NormalizedAutomationScenarioConfig,
  NormalizedScenarioAction,
  NormalizedScenarioValue,
  PlanStepStatus,
  ResolvedAutomationGroup,
  ResolvedScenarioExplanationBinding,
  ResolvedLinkedAutomation,
  ResolvedScenarioSetting,
  ScenarioSettingControl,
  ScenarioValueBinding,
} from "./automation-scenario.types.ts";

function stateValue(hass: HomeAssistant | undefined, entityId?: string): string {
  if (!hass || !entityId) return "";
  const value = hass.states[entityId]?.state?.trim() ?? "";
  return value === "unknown" || value === "unavailable" || value === "restored" ? "" : value;
}

function displayEntityState(hass:HomeAssistant|undefined,entityId:string,raw:string):string {
  if (raw === "unavailable") return "Unavailable";
  if (raw === "unknown") return "Unknown";
  if (raw === "restored") return "Restored";
  const entity=hass?.states[entityId];
  const formatter=(hass as (HomeAssistant&{formatEntityState?:(state:typeof entity)=>string})|undefined)?.formatEntityState;
  if (formatter&&entity) {
    try { return formatter.call(hass,entity); } catch { /* use metadata fallback */ }
  }
  if (entityId.startsWith("binary_sensor.")) {
    const deviceClass=String(entity?.attributes.device_class??"");
    const labels:Record<string,[string,string]>={
      connectivity:["Disconnected","Connected"],door:["Closed","Open"],garage_door:["Closed","Open"],
      opening:["Closed","Open"],window:["Closed","Open"],lock:["Locked","Unlocked"],
      occupancy:["Clear","Detected"],motion:["Clear","Detected"],presence:["Away","Home"],
      problem:["OK","Problem"],safety:["Unsafe","Safe"],running:["Stopped","Running"],
      battery:["Normal","Low"],plug:["Unplugged","Plugged in"],power:["No power","Powered"],
    };
    const pair=labels[deviceClass];
    if (pair&&(raw==="on"||raw==="off")) return pair[raw==="on"?1:0];
  }
  return raw;
}

function resolveExplanationBinding(
  hass:HomeAssistant | undefined,
  entityId?:string
):ResolvedScenarioExplanationBinding {
  if (!entityId) return { status:"not_configured" };
  const entity = hass?.states[entityId];
  if (!entity) return { entityId,status:"missing" };
  const raw = entity.state?.trim() ?? "";
  if (raw === "unavailable") return { entityId,status:"unavailable" };
  if (raw === "unknown") return { entityId,status:"unknown" };
  if (!raw) return { entityId,status:"missing" };
  return { entityId,status:"valid",value:raw };
}

function isAvailable(hass: HomeAssistant | undefined, entityId?: string): boolean {
  return Boolean(hass && entityId && hass.states[entityId] && stateValue(hass,entityId));
}

function friendlyName(hass: HomeAssistant | undefined, entityId: string, fallback?: string): string {
  return fallback?.trim() || String(hass?.states[entityId]?.attributes.friendly_name ?? entityId);
}

function formatTemporal(value: string, includeDate: boolean): string {
  if (!value) return "--";
  if (!includeDate && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0,5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, includeDate
    ? { dateStyle:"medium", timeStyle:"short" }
    : { timeStyle:"short" }).format(date);
}

function resolveValue(
  hass: HomeAssistant | undefined,
  binding: ScenarioValueBinding
): NormalizedScenarioValue & { rawValue:string } {
  const entity = hass?.states[binding.entity];
  const rawValue = entity?.state?.trim() ?? "";
  const available = isAvailable(hass,binding.entity);
  let value = rawValue ? displayEntityState(hass,binding.entity,rawValue) : "--";
  let unit = String(entity?.attributes.unit_of_measurement ?? "");
  const requestedFormat=binding.format??"text";
  const deviceClass=String(entity?.attributes.device_class??"");
  const effectiveFormat=requestedFormat==="auto"
    ? deviceClass==="power"?"power":deviceClass==="energy"?"energy":deviceClass==="temperature"?"temperature":deviceClass==="battery"?"percentage":"number"
    : requestedFormat;
  if (available && ["number","power","energy","temperature","percentage","duration"].includes(effectiveFormat)) {
    const formatted = formatMetric(parseNumericEntityState(hass,binding.entity), {
      autoScale:effectiveFormat === "power" || effectiveFormat === "energy",
      decimals:effectiveFormat === "percentage" ? 0 : 2,
      trimTrailingZeros:true,
    });
    if (formatted.status === "valid") { value = formatted.value; unit = formatted.unit; }
    else { value=rawValue==="unavailable"?"Unavailable":rawValue==="unknown"?"Unknown":"--"; unit=""; }
  } else if (available && (effectiveFormat === "time" || effectiveFormat === "datetime")) {
    value = formatTemporal(rawValue,effectiveFormat === "datetime");
    unit = "";
  }
  return {
    label:binding.label?.trim() || friendlyName(hass,binding.entity),
    icon:binding.icon,
    value,
    unit,
    available,
    rawValue,
  };
}

function inferControl(entityId: string, requested: ScenarioSettingControl = "auto"): ResolvedScenarioSetting["control"] {
  if (requested !== "auto") return requested;
  switch (entityId.split(".",1)[0]) {
    case "switch": case "input_boolean": case "fan": case "light": return "toggle";
    case "select": case "input_select": return "select";
    case "number": case "input_number": return "number";
    case "input_datetime": return "datetime";
    default: return "unsupported";
  }
}

function resolveAction(
  hass: HomeAssistant | undefined,
  action: NormalizedScenarioAction | NormalizedAutomationScenarioConfig["actions"][number],
  lifecycle: LifecycleStatus
): NormalizedScenarioAction {
  let valid = true;
  try { resolveAutomationActionCall(action); } catch { valid = false; }
  const target = action.script_entity || action.target_entity;
  const targetAvailable = Boolean(target && hass?.states[target]);
  return {
    ...action,
    label:action.label?.trim() || action.id,
    tone:action.tone ?? "neutral",
    available:valid && targetAvailable && (!action.available_when?.length || action.available_when.includes(lifecycle)),
  };
}

function resolveLinkedAutomation(
  hass: HomeAssistant | undefined,
  config: NormalizedAutomationScenarioConfig["automationGroups"][number]["automations"][number],
  lifecycle: LifecycleStatus
): ResolvedLinkedAutomation {
  const enabledEntity = config.enabled_entity || config.entity;
  const deviceEntity=config.device?hass?.states[config.device.entity]:undefined;
  const deviceRawState=deviceEntity?.state?.trim()??"";
  const deviceState = config.device ? displayEntityState(hass,config.device.entity,deviceRawState) : "";
  const deviceAvailable=config.device?isAvailable(hass,config.device.entity):false;
  const resolveOptional = (binding?: ScenarioValueBinding) => binding ? { ...resolveValue(hass,binding),entityId:binding.entity } : undefined;
  return {
    id:config.id,
    entityId:config.entity,
    name:friendlyName(hass,config.entity,config.name),
    description:config.description,
    available:isAvailable(hass,config.entity),
    enabled:stateValue(hass,enabledEntity).toLowerCase() === "on",
    enabledAvailable:isAvailable(hass,enabledEntity),
    parameters:(config.parameters ?? []).map((parameter) => ({
      ...resolveValue(hass,parameter), id:parameter.id, entityId:parameter.entity,
    })),
    device:config.device ? {
      entityId:config.device.entity,
      name:friendlyName(hass,config.device.entity,config.device.name),
      icon:config.device.icon,
      state:deviceState || "--",
      available:deviceAvailable,
      domain:config.device.entity.split(".",1)[0],
      attributes:deviceAvailable?{...(deviceEntity?.attributes??{})}:{},
    } : undefined,
    current:resolveOptional(config.current),
    next:resolveOptional(config.next),
    last:resolveOptional(config.last),
    quickActions:(config.quick_actions ?? []).map((action) => resolveAction(hass,action,lifecycle)),
    editorTarget:config.editor_target,
  };
}

function resolvePlan(hass: HomeAssistant | undefined, config: NormalizedAutomationScenarioConfig, lifecycle: LifecycleStatus): NormalizedAutomationPlan | undefined {
  if (!config.plan?.steps?.length) return undefined;
  const explicitCurrent = stateValue(hass,config.plan.current_step_entity);
  const steps = config.plan.steps.map((step) => {
    const mapped = step.status_entity
      ? step.status_mappings?.[stateValue(hass,step.status_entity)]
      : undefined;
    const status:PlanStepStatus = mapped ?? step.status ??
      (step.id === explicitCurrent || step.lifecycle_states?.includes(lifecycle) ? "current" : "upcoming");
    return { id:step.id, label:step.label, icon:step.icon, description:step.description, detail:stateValue(hass,step.detail_entity) || undefined, status };
  });
  const currentStepIndex = steps.findIndex((step) => step.status === "current");
  return { currentStepId:currentStepIndex >= 0 ? steps[currentStepIndex].id : undefined, currentStepIndex:currentStepIndex >= 0 ? currentStepIndex : undefined, steps };
}

export function resolveAutomationScenarioRuntime(
  hass: HomeAssistant | undefined,
  config: NormalizedAutomationScenarioConfig
): NormalizedAutomationScenario {
  const rawStatus = normalizeLifecycleStateKey(hass?.states[config.statusEntity]?.state ?? "");
  const lifecycle = config.statusMappings[rawStatus] ?? (rawStatus ? "unknown" : "unavailable");
  const lifecyclePresentation = {
    status:lifecycle,
    label:lifecycle.replace(/_/g," ").replace(/^./,(letter) => letter.toUpperCase()),
    icon:lifecycle === "running" ? "mdi:play-circle" : lifecycle === "blocked" ? "mdi:alert-circle" : "mdi:circle-outline",
    tone:lifecycle === "running" || lifecycle === "completed" ? "success" as const : lifecycle === "blocked" ? "critical" as const : "neutral" as const,
  };
  const strategyRaw = config.strategy ? stateValue(hass,config.strategy.entity) : "";
  const strategyMapping = config.strategyMappings[strategyRaw] ?? {};
  const progress=config.progress?.current_entity ? (()=>{
    const current=parseNumericEntityState(hass,config.progress!.current_entity!);
    const target=parseNumericEntityState(hass,config.progress!.target_entity??"");
    let unit=config.progress!.unit || current.unit || target.unit;
    let currentNumeric=current.value,targetNumeric=target.value;
    if(!config.progress!.unit&&current.value!==null&&target.value!==null){
      const currentBase=convertToBaseUnit(current.value,current.unit),targetBase=convertToBaseUnit(target.value,target.unit);
      if(currentBase.family!=="other"&&currentBase.family===targetBase.family){currentNumeric=currentBase.value;targetNumeric=targetBase.value;unit=currentBase.unit;}
    }
    const autoScale=["W","kW","MW","Wh","kWh","MWh"].includes(unit);
    const display=(value:number|null,status:typeof current.status)=>formatMetric({entityId:"",name:"",value,status,unit},{unit,autoScale,decimals:1,trimTrailingZeros:true});
    const withUnit=(formatted:ReturnType<typeof display>)=>`${formatted.value}${formatted.unit?` ${formatted.unit}`:""}`;
    const currentAvailable=current.status==="valid"&&currentNumeric!==null;
    const targetAvailable=target.status==="valid"&&targetNumeric!==null;
    const available=currentAvailable&&targetAvailable;
    const remaining=available ? targetNumeric!-currentNumeric! : null;
    const currentAttributes=hass?.states[config.progress!.current_entity!]?.attributes??{};
    const targetAttributes=hass?.states[config.progress!.target_entity??""]?.attributes??{};
    const numeric=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;};
    const explicitMin=numeric(config.progress!.min),explicitMax=numeric(config.progress!.max);
    const metadataMin=numeric(currentAttributes.min)??numeric(targetAttributes.min);
    const metadataMax=numeric(currentAttributes.max)??numeric(targetAttributes.max);
    const percentRange=unit==="%"||String(currentAttributes.device_class??"")==="battery";
    const rangeMin=explicitMin??metadataMin??(percentRange?0:undefined);
    const rangeMax=explicitMax??metadataMax??(percentRange?100:undefined);
    const rangeKnown=rangeMin!==undefined&&rangeMax!==undefined&&rangeMax>rangeMin;
    const relativeMin=rangeKnown?rangeMin:currentAvailable&&targetAvailable?Math.min(0,currentNumeric!,targetNumeric!):undefined;
    const relativeMax=rangeKnown?rangeMax:currentAvailable&&targetAvailable
      ? currentNumeric!>targetNumeric!?currentNumeric!+Math.max(Math.abs(currentNumeric!-targetNumeric!)*.25,Math.abs(currentNumeric!)*.05,1):targetNumeric!
      : undefined;
    const position=(value:number|null)=>value!==null&&relativeMin!==undefined&&relativeMax!==undefined&&relativeMax>relativeMin
      ? Math.max(0,Math.min(1,(value-relativeMin)/(relativeMax-relativeMin))):undefined;
    const estimated=config.progress!.estimated_entity ? resolveValue(hass,{entity:config.progress!.estimated_entity,format:"time"}) : undefined;
    const currentPosition=currentAvailable?position(currentNumeric):undefined;
    const markerPosition=targetAvailable?position(targetNumeric):undefined;
    const stateDisplay=(status:typeof current.status,value:number|null)=>status==="unavailable"?"Unavailable":status==="unknown"?"Unknown":withUnit(display(value,status));
    return {label:config.progress!.label??"Progress",mode:config.progress!.mode??"target",currentLabel:config.progress!.current_label??"Current",currentValue:stateDisplay(current.status,currentNumeric),targetLabel:config.progress!.target_label??(config.progress!.mode==="threshold"?"Threshold":"Target"),targetValue:stateDisplay(target.status,targetNumeric),remainingLabel:config.progress!.remaining_label??"Remaining",remainingValue:withUnit(display(remaining,available?"valid":"invalid")),estimated:estimated?.available?estimated.value:undefined,ratio:currentPosition,currentPosition,markerPosition,rangeMinValue:rangeKnown?withUnit(display(rangeMin!,"valid")):undefined,rangeMaxValue:rangeKnown?withUnit(display(rangeMax!,"valid")):undefined,rangeKnown,currentAvailable,targetAvailable,available,sourceEntityIds:[config.progress!.current_entity,config.progress!.target_entity,config.progress!.estimated_entity].filter((entity):entity is string=>Boolean(entity))};
  })() : undefined;
  const decisionObservedId=canonicalAutomationEntityId(config.explanation.decision_context?.observed_entity);
  const decisionUsesDevice=Boolean(decisionObservedId && (
    canonicalAutomationEntityId(config.execution?.entity)===decisionObservedId ||
    config.settings.some(setting=>canonicalAutomationEntityId(setting.entity)===decisionObservedId&&(setting.role==="device"||setting.scope==="device")) ||
    config.automationGroups.some(group=>group.automations.some(automation=>canonicalAutomationEntityId(automation.device?.entity)===decisionObservedId))
  ));
  const decisionContext=config.explanation.decision_context?.observed_entity && !decisionUsesDevice ? (()=>{
    const context=config.explanation.decision_context!;
    const observed=parseNumericEntityState(hass,context.observed_entity!);
    const threshold=context.threshold_entity ? parseNumericEntityState(hass,context.threshold_entity) : context.threshold!==undefined ? {...observed,value:context.threshold,status:"valid" as const} : undefined;
    const unit=observed.unit||threshold?.unit||"";
    const display=(input:typeof observed|undefined)=>input ? formatMetric(input,{unit,autoScale:true,decimals:1,trimTrailingZeros:false}) : undefined;
    const observedDisplay=display(observed),thresholdDisplay=display(threshold);
    const message=context.message_entity ? resolveValue(hass,{entity:context.message_entity,format:"text"}).value : undefined;
    const available=observed.status==="valid"&&threshold?.status==="valid"&&observed.value!==null&&threshold.value!==null;
    const difference=available?observed.value!-threshold!.value!:undefined;
    const differenceDisplay=difference!==undefined?formatMetric({...observed,value:Math.abs(difference),status:"valid"},{unit,autoScale:true,decimals:1,trimTrailingZeros:false}):undefined;
    const observedUnit=observedDisplay?.unit||unit,thresholdUnit=thresholdDisplay?.unit||unit,differenceUnit=differenceDisplay?.unit||unit;
    const numeric=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;};
    const observedAttributes=hass?.states[context.observed_entity!]?.attributes??{};
    const thresholdAttributes=hass?.states[context.threshold_entity??""]?.attributes??{};
    const metadataMin=numeric(observedAttributes.min)??numeric(thresholdAttributes.min);
    const metadataMax=numeric(observedAttributes.max)??numeric(thresholdAttributes.max);
    const percentRange=unit==="%"||String(observedAttributes.device_class??"")==="battery";
    const relativeMin=metadataMin??(percentRange?0:available?Math.min(0,observed.value!,threshold!.value!):undefined);
    const relativeMax=metadataMax??(percentRange?100:available?Math.max(observed.value!,threshold!.value!)+Math.max(Math.abs(difference!)*.25,Math.abs(observed.value!)*.05,1):undefined);
    const position=(value:number|null|undefined)=>value!==null&&value!==undefined&&relativeMin!==undefined&&relativeMax!==undefined&&relativeMax>relativeMin?Math.max(0,Math.min(1,(value-relativeMin)/(relativeMax-relativeMin))):undefined;
    return {observedLabel:context.observed_label??observed.name,observedValue:`${observedDisplay?.value??"--"}${observedUnit?` ${observedUnit}`:""}`,thresholdLabel:context.threshold_label??"Threshold",thresholdValue:`${thresholdDisplay?.value??"--"}${thresholdUnit?` ${thresholdUnit}`:""}`,message,difference,differenceValue:differenceDisplay&&difference!==undefined?`${difference>=0?"+":"-"}${differenceDisplay.value}${differenceUnit?` ${differenceUnit}`:""}`:undefined,available,currentPosition:available?position(observed.value):undefined,markerPosition:available?position(threshold?.value):undefined,sourceEntityIds:[context.observed_entity,context.threshold_entity,context.message_entity].filter((entity):entity is string=>Boolean(entity))};
  })() : undefined;
  const nextDecision=config.nextDecision ? (()=>{const item=config.nextDecision!;const value=(entity:string|undefined,fallback:string|undefined,format:"time"|"text")=>entity?resolveValue(hass,{entity,format}).value:fallback;return {time:value(item.time_entity,item.time,"time"),label:value(item.label_entity,item.label,"text"),condition:value(item.condition_entity,item.condition,"text"),sourceEntityIds:[item.time_entity,item.label_entity,item.condition_entity].filter((entity):entity is string=>Boolean(entity))};})() : undefined;
  const settings:ResolvedScenarioSetting[] = config.settings.map((setting) => {
    const regular = resolveValue(hass,setting);
    const entity = hass?.states[setting.entity];
    const overrideValue = setting.override ? resolveValue(hass,{...setting,entity:setting.override.value_entity}) : undefined;
    const overrideActiveRaw = setting.override ? stateValue(hass,setting.override.active_entity).toLowerCase() : "";
    const overrideActive = overrideActiveRaw === "on";
    const overrideActiveAvailable = setting.override ? isAvailable(hass,setting.override.active_entity) : false;
    const effective = overrideActive && overrideValue ? overrideValue : regular;
    const overrideConfigured=Boolean(setting.override);
    const overrideMissing=Boolean(setting.override && (!hass?.states[setting.override.value_entity] || !hass?.states[setting.override.active_entity]));
    const overrideAvailable=Boolean(setting.override && overrideActiveAvailable && overrideValue?.available === true);
    const overrideState:ResolvedScenarioSetting["overrideState"] = !overrideConfigured ? "not_configured"
      : overrideMissing ? "missing"
      : !overrideAvailable ? "unavailable"
      : overrideActive ? "active" : "inactive";
    return {
      ...effective,
      id:setting.id,
      entityId:setting.entity,
      control:inferControl(setting.entity,setting.control),
      changeMode:setting.change_mode ?? "direct",
      scope:setting.scope,
      role:setting.role,
      presentation:config.strategy && canonicalAutomationEntityId(config.strategy.entity) === canonicalAutomationEntityId(setting.entity) ? config.strategy.presentation : undefined,
      regularValue:regular.value,
      regularRawValue:regular.rawValue,
      regularAvailable:regular.available,
      effectiveValue:effective.value,
      effectiveRawValue:effective.rawValue,
      overrideActive,
      overrideValue:overrideValue?.value,
      overrideAvailable,
      overrideState,
      override:setting.override ? {
        valueEntityId:setting.override.value_entity,
        activeEntityId:setting.override.active_entity,
        active:overrideActive,
        available:overrideAvailable,
        value:overrideValue?.value ?? "--",
        rawValue:overrideValue?.rawValue ?? "",
      } : undefined,
      options:Array.isArray(entity?.attributes.options) ? entity.attributes.options.map(String) : undefined,
      min:typeof entity?.attributes.min === "number" ? entity.attributes.min : undefined,
      max:typeof entity?.attributes.max === "number" ? entity.attributes.max : undefined,
      step:typeof entity?.attributes.step === "number" ? entity.attributes.step : undefined,
      entityDomain:setting.entity.split(".",1)[0],
      entityAttributes:regular.available?{...(entity?.attributes??{})}:{},
    };
  });
  const automationGroups:ResolvedAutomationGroup[] = config.automationGroups.map((group) => ({
    id:group.id,
    label:group.label,
    icon:group.icon,
    automations:group.automations.map((automation) => resolveLinkedAutomation(hass,automation,lifecycle)),
  }));
  const reasonBinding = resolveExplanationBinding(hass,config.explanation.reason_entity || config.reasonEntity);
  const nextActionBinding = resolveExplanationBinding(hass,config.explanation.next_action_entity);
  const lastActionBinding = resolveExplanationBinding(hass,config.explanation.last_action_entity);
  return {
    id:config.id,
    templateId:config.templateId,
    identity:config.identity,
    lifecycle:lifecyclePresentation,
    goals:config.goals.map((goal) => ({ ...resolveValue(hass,goal), id:goal.id, description:goal.description })),
    strategy:config.strategy ? { ...strategyMapping, rawValue:strategyRaw, label:strategyMapping.label || strategyRaw || "Unavailable", icon:strategyMapping.icon || "mdi:tune-variant", tone:strategyMapping.tone || "neutral",presentation:config.strategy.presentation??"select" } : undefined,
    metrics:config.metrics.map((metric) => ({ ...resolveValue(hass,metric), entityId:metric.entity, role:metric.role ?? "secondary", iconColor:metric.icon_color?.trim() || undefined,highlightId:`metric:${canonicalAutomationEntityId(metric.entity)}` })),
    dashboard:config.dashboard,
    settings,
    automationGroups,
    execution:config.execution ? {
      entityId:config.execution.entity,
      label:config.execution.label || friendlyName(hass,config.execution.entity),
      icon:config.execution.icon || "mdi:power",
      rawState:stateValue(hass,config.execution.entity),
      stateLabel:stateValue(hass,config.execution.entity) || "Unavailable",
      active:stateValue(hass,config.execution.entity).toLowerCase() === "on",
      tone:isAvailable(hass,config.execution.entity) ? "neutral" : "critical",
      control:config.execution.control,
    } : undefined,
    progress,
    decisionContext,
    nextDecision,
    plan:resolvePlan(hass,config,lifecycle),
    explanation:{
      stateLabel:lifecyclePresentation.label,
      reason:reasonBinding.value,
      nextAction:nextActionBinding.value,
      lastAction:lastActionBinding.value,
      lastActionTime:config.explanation.last_action_entity
        ? hass?.states[config.explanation.last_action_entity]?.last_changed
        : undefined,
      bindings:{ reason:reasonBinding,nextAction:nextActionBinding,lastAction:lastActionBinding },
    },
    actions:config.actions.map((action) => resolveAction(hass,action,lifecycle)),
    visibility:config.visibility,
  };
}
