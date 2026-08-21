import { automationTemplateRegistry } from "../../automation/automation-template-registry.ts";
import type {
  AutomationScenarioConfig,
  AutomationTemplateId,
  LinkedAutomationConfig,
  ScenarioDecisionContextConfig,
  ScenarioProgressConfig,
} from "../../automation/automation-scenario.types.ts";

export type AutomationScenarioPreset = "blank" | "pet_care" | "solar_water_heating" | "ev_smart_charging";
export type ActivityEditorReadiness = "configure" | "edit" | "attention";

export function getProgressEditorReadiness(progress:ScenarioProgressConfig|undefined):ActivityEditorReadiness {
  const hasAny=Boolean(progress?.current_entity||progress?.target_entity||progress?.estimated_entity);
  if(!hasAny)return "configure";
  return progress?.current_entity&&progress.target_entity?"edit":"attention";
}

export function getThresholdComparisonEditorReadiness(context:ScenarioDecisionContextConfig|undefined):ActivityEditorReadiness {
  const hasAny=Boolean(context&&(context.observed_entity||context.threshold_entity||context.threshold!==undefined||context.message_entity||context.summary_entity||context.factors?.length));
  if(!hasAny)return "configure";
  return context?.observed_entity&&(context.threshold_entity||context.threshold!==undefined)?"edit":"attention";
}

export interface ScenarioPresetBinding {
  key:string;
  label:string;
  target:"status"|"strategy"|"setting"|"metric"|"quick_action"|"auxiliary";
  id?:string;
  format?:"auto"|"time"|"percentage"|"power"|"number";
  control?:"auto"|"toggle"|"select"|"time";
  domains?:string[];
  groupId?:string;
  service?:string;
  scope?:"scenario"|"device";
  role?:"scenario"|"device"|"observed"|"manual_override";
  presentation?:"select"|"segmented";
  progressField?:"current_entity"|"target_entity"|"estimated_entity";
  progressLabel?:string;
  progressMode?:"target"|"threshold";
  progressTargetLabel?:string;
  decisionField?:"observed_entity"|"threshold_entity"|"message_entity";
  nextDecisionField?:"time_entity"|"label_entity"|"condition_entity";
}

export const scenarioPresetBindings:Record<AutomationScenarioPreset,readonly ScenarioPresetBinding[]> = {
  blank:[{ key:"status",label:"Status Entity",target:"status" }],
  pet_care:[
    { key:"status",label:"Status Entity",target:"status" },
    { key:"feeding-status",label:"Feeding Status",target:"metric",id:"feeding-status",format:"auto" },
    { key:"food-remaining",label:"Food Remaining",target:"metric",id:"food-remaining",format:"number",progressField:"current_entity",progressLabel:"Food Remaining",progressMode:"threshold" },
    { key:"food-low-threshold",label:"Low Stock Threshold",target:"auxiliary",progressField:"target_entity",progressMode:"threshold",progressTargetLabel:"Low Stock" },
    { key:"room-temperature",label:"Room Temperature",target:"metric",id:"room-temperature",format:"number",decisionField:"observed_entity" },
    { key:"cooling-threshold",label:"Cooling Threshold",target:"auxiliary",decisionField:"threshold_entity" },
    { key:"decision-message",label:"Temperature Decision Summary",target:"auxiliary",decisionField:"message_entity" },
    { key:"next-decision-time",label:"Next Feeding Time",target:"auxiliary",nextDecisionField:"time_entity",domains:["input_datetime"] },
    { key:"next-decision-label",label:"Next Feeding",target:"auxiliary",nextDecisionField:"label_entity" },
    { key:"care-mode",label:"Care Mode",target:"setting",id:"care-mode",control:"select",role:"scenario" },
    { key:"strategy",label:"Strategy",target:"strategy",presentation:"segmented" },
    { key:"manual-override",label:"Manual Override",target:"setting",id:"manual-override",control:"toggle",role:"manual_override" },
    { key:"feed-now",label:"Feed Now",target:"quick_action",id:"feed-now",groupId:"feeding",service:"input_button.press",domains:["input_button","button"] },
  ],
  solar_water_heating:[
    { key:"status",label:"Status Entity",target:"status" },
    { key:"strategy",label:"Heating Strategy",target:"strategy",presentation:"segmented" },
    { key:"target-time",label:"Target Time",target:"setting",id:"target-time",format:"time",control:"time",role:"scenario" },
    { key:"manual-override",label:"Manual Override",target:"setting",id:"manual-override",control:"toggle",role:"manual_override" },
    { key:"water-temperature",label:"Water Temperature",target:"metric",id:"water-temperature",format:"number",progressField:"current_entity",progressLabel:"Water Temperature",progressMode:"target" },
    { key:"target-temperature",label:"Target Temperature",target:"auxiliary",progressField:"target_entity" },
    { key:"estimated-ready",label:"Estimated Ready",target:"auxiliary",progressField:"estimated_entity",domains:["input_datetime"] },
    { key:"solar-power",label:"Solar Surplus",target:"metric",id:"solar-power",format:"power",decisionField:"observed_entity" },
    { key:"start-threshold",label:"Start Threshold",target:"auxiliary",decisionField:"threshold_entity" },
    { key:"decision-message",label:"Heating Decision Summary",target:"auxiliary",decisionField:"message_entity" },
    { key:"next-decision-time",label:"Grid Backup Time",target:"auxiliary",nextDecisionField:"time_entity",domains:["input_datetime"] },
    { key:"next-decision-label",label:"Next Decision",target:"auxiliary",nextDecisionField:"label_entity" },
    { key:"next-decision-condition",label:"Next Decision Condition",target:"auxiliary",nextDecisionField:"condition_entity" },
  ],
  ev_smart_charging:[
    { key:"status",label:"Status Entity",target:"status" },
    { key:"strategy",label:"Charging Mode",target:"strategy",presentation:"segmented" },
    { key:"departure-time",label:"Departure Time",target:"setting",id:"departure-time",format:"time",control:"time",role:"scenario" },
    { key:"battery-level",label:"Battery Level",target:"metric",id:"battery-level",format:"percentage",progressField:"current_entity",progressLabel:"Battery",progressMode:"target" },
    { key:"target-soc",label:"Target SoC",target:"auxiliary",progressField:"target_entity" },
    { key:"estimated-ready",label:"Estimated Ready",target:"auxiliary",progressField:"estimated_entity",domains:["input_datetime"] },
    { key:"charger-power",label:"Charger Power",target:"metric",id:"charger-power",format:"power" },
    { key:"ev-connected",label:"EV Connected",target:"setting",id:"ev-connected",control:"auto",role:"observed" },
    { key:"solar-surplus",label:"Solar Surplus",target:"metric",id:"solar-surplus",format:"power",decisionField:"observed_entity" },
    { key:"start-threshold",label:"Start Threshold",target:"auxiliary",decisionField:"threshold_entity" },
    { key:"decision-message",label:"Charging Decision Summary",target:"auxiliary",decisionField:"message_entity" },
    { key:"next-decision-time",label:"Next Charging Window",target:"auxiliary",nextDecisionField:"time_entity",domains:["input_datetime"] },
    { key:"next-decision-label",label:"Next Decision",target:"auxiliary",nextDecisionField:"label_entity" },
    { key:"next-decision-condition",label:"Next Decision Condition",target:"auxiliary",nextDecisionField:"condition_entity" },
    { key:"electricity-price",label:"Electricity Price",target:"metric",id:"electricity-price",format:"number" },
  ],
};

export const scenarioBlueprintRecommendations:Record<AutomationScenarioPreset,readonly string[]> = {
  blank:[],
  pet_care:["Scheduled Feeding","Feeder Offline Alert","Pet Room Climate"],
  solar_water_heating:["Solar Surplus Heating","Grid Backup","Temperature Protection"],
  ev_smart_charging:["Off-Peak Charging","Solar Surplus Charging","Departure Target"],
};

export function createStableEditorId(label:string, existing:readonly string[]):string {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "item";
  if (!existing.includes(base)) return base;
  let suffix = 2;
  while (existing.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function createScenarioFromPreset(
  preset:AutomationScenarioPreset,
  statusEntity:string,
  existingIds:readonly string[]
):AutomationScenarioConfig {
  const templateId:AutomationTemplateId = preset === "blank" ? "custom" : preset === "pet_care" ? "pet-care" : preset;
  const template = automationTemplateRegistry.getOrCustom(templateId);
  const scenario:AutomationScenarioConfig = {
    id:createStableEditorId(template.identityDefaults.title,existingIds),
    template:templateId,
    identity:{ ...template.identityDefaults },
    status_entity:statusEntity,
    status_mappings:{ ...template.statusMappings },
    strategy_mappings:{ ...template.strategyMappings },
    automation_groups:(template.automationGroupRecommendations ?? []).map((group) => ({ ...group,automations:[] })),
  };
  if (preset === "solar_water_heating") scenario.identity = { ...scenario.identity,icon:"mdi:water-boiler" };
  if (preset === "ev_smart_charging") {
    scenario.identity = { ...scenario.identity,icon:"mdi:ev-station" };
    scenario.automation_groups = [
      { id:"charging",label:"Charging",automations:[] },
      { id:"optimization",label:"Optimization",automations:[] },
    ];
  }
  return scenario;
}

export function applyPresetBinding(
  scenario:AutomationScenarioConfig,
  binding:ScenarioPresetBinding,
  entity:string
):AutomationScenarioConfig {
  const applyPresentation=(next:AutomationScenarioConfig):AutomationScenarioConfig=>{
    if (binding.progressField) {
      const progress={...(next.progress??{}),...(binding.progressLabel?{label:binding.progressLabel}:{}),...(binding.progressMode?{mode:binding.progressMode}:{}),...(binding.progressField==="current_entity"?{current_label:"Current"}:{}),...(binding.progressField==="target_entity"?{target_label:binding.progressTargetLabel??(binding.progressMode==="threshold"?"Threshold":"Target")}:{}) ,[binding.progressField]:entity||undefined};
      next={...next,progress:Object.values(progress).some(Boolean)?progress:undefined};
    }
    if (binding.decisionField) {
      const decision_context={...(next.explanation?.decision_context??{}),...(binding.decisionField==="observed_entity"?{observed_label:binding.label}:{}),...(binding.decisionField==="threshold_entity"?{threshold_label:binding.label}:{}),[binding.decisionField]:entity||undefined};
      next={...next,explanation:{...(next.explanation??{}),decision_context:Object.values(decision_context).some(Boolean)?decision_context:undefined}};
    }
    if (binding.nextDecisionField) {
      const next_decision={...(next.next_decision??{}),[binding.nextDecisionField]:entity||undefined};
      next={...next,next_decision:Object.values(next_decision).some(Boolean)?next_decision:undefined};
    }
    return next;
  };
  if (binding.target === "status") return applyPresentation({ ...scenario,status_entity:entity });
  if (binding.target === "strategy") {
    const settings=(scenario.settings??[]).filter(item=>item.id!=="strategy");
    return applyPresentation({ ...scenario,strategy:entity ? { ...(scenario.strategy ?? {}),entity,presentation:binding.presentation } : undefined,strategy_entity:undefined,
      settings:entity?[...settings,{id:"strategy",entity,label:binding.label,control:"select",role:"scenario"}]:settings });
  }
  if (binding.target === "setting") {
    const items=(scenario.settings ?? []).filter((item) => item.id !== binding.id);
    return applyPresentation({ ...scenario,settings:entity ? [...items,{ id:binding.id!,entity,label:binding.label,format:binding.format ?? "auto",control:binding.control ?? "auto",role:binding.role,scope:binding.scope }] : items });
  }
  if (binding.target === "quick_action") {
    const actions=(scenario.actions ?? []).filter((action) => action.id !== binding.id);
    const selectedDomain=entity.split(".",1)[0];
    const service=binding.service==="input_button.press"&&selectedDomain==="button"?"button.press":binding.service;
    return applyPresentation({ ...scenario,actions:entity ? [...actions,{
      id:binding.id!, label:binding.label, service, target_entity:entity,group_id:binding.groupId,
    }] : actions });
  }
  if (binding.target === "auxiliary") return applyPresentation(scenario);
  const items=(scenario.metrics ?? []).filter((item) => item.label !== binding.label);
  return applyPresentation({ ...scenario,metrics:entity ? [...items,{ entity,label:binding.label,format:binding.format ?? "auto",role:"secondary" }] : items });
}

export function validateScenarioDraftForEditor(scenario:AutomationScenarioConfig):string[] {
  const errors:string[]=[];
  if (!scenario.identity?.title?.trim() && !scenario.title?.trim()) errors.push("Scenario Name is required.");
  if (!scenario.status_entity?.trim()) errors.push("Choose a Status Entity before saving this Scenario.");
  const ids=new Set<string>();
  for (const group of scenario.automation_groups ?? []) for (const automation of group.automations) {
    if (ids.has(automation.id)) errors.push("This automation already exists in the Scenario.");
    ids.add(automation.id);
    for (const action of automation.quick_actions ?? []) {
      if (action.service && !action.service.includes(".")) errors.push(`${action.label ?? "Quick Action"}: Service must use domain.service format.`);
      if (action.service && !action.target_entity && !action.script_entity) errors.push(`${action.label ?? "Quick Action"}: Target Entity is required.`);
    }
  }
  return errors;
}

export function createLinkedAutomation(
  entity:string,
  friendlyName:string,
  existingIds:readonly string[]
):LinkedAutomationConfig {
  return {
    id:createStableEditorId(entity.replace(/^automation\./,""),existingIds),
    entity,
    name:friendlyName || entity,
  };
}

export function moveEditorItem<T>(items:readonly T[],index:number,direction:-1|1):T[] {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return [...items];
  const result = [...items];
  [result[index],result[target]] = [result[target],result[index]];
  return result;
}

export function formatEditorCount(count:number,singular:string,plural=`${singular}s`):string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getAutomationEditorParentKind(kind:string):string | undefined {
  const parents:Record<string,string> = {
    scenario:"section",
    metrics:"scenario", metric:"metrics",
    controls:"scenario", control:"controls",
    "scenario-status":"scenario",
    "automation-activity":"scenario",
    "activity-footer":"scenario",
    groups:"scenario", group:"groups",
    automation:"group",
  };
  return parents[kind];
}
