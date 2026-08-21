import type { LifecycleStatus, NormalizedAutomationScenario } from "./automation-scenario.types.ts";
import { canonicalAutomationEntityId } from "./automation-entity-identity.ts";
import { resolveAutomationHighlights,type AutomationHighlightCandidate } from "./automation-highlight-candidates.ts";

const LIFECYCLE_ICONS:Record<LifecycleStatus,string> = {
  running:"mdi:progress-clock",
  waiting:"mdi:clock-outline",
  scheduled:"mdi:calendar-clock-outline",
  paused:"mdi:pause-circle-outline",
  completed:"mdi:check-circle-outline",
  blocked:"mdi:alert-circle-outline",
  disabled:"mdi:pause-circle-outline",
  unavailable:"mdi:cloud-alert-outline",
  unknown:"mdi:help-circle-outline",
};

export function getAutomationLifecycleIcon(status:LifecycleStatus):string {
  return LIFECYCLE_ICONS[status];
}

export interface AutomationScenarioCardDevice { entityId:string; name:string; }
export interface AutomationScenarioCardModel {
  active:boolean;
  devices:AutomationScenarioCardDevice[];
  hiddenDeviceCount:number;
  metrics:AutomationHighlightCandidate[];
  automationSummary:{ label:string; value:string }[];
  reason?:string;
  activity:{ lifecycle:string; status:LifecycleStatus; icon:string; tone:NormalizedAutomationScenario["lifecycle"]["tone"]; reason?:string; lastAction?:string; nextAction?:string };
}

export function buildAutomationScenarioCardModel(
  scenario:NormalizedAutomationScenario
):AutomationScenarioCardModel {
  const automations=scenario.automationGroups.flatMap((group)=>group.automations);
  const active=scenario.lifecycle.status !== "disabled" && automations.some(
    (automation)=>automation.enabledAvailable && automation.enabled
  );
  const devices:AutomationScenarioCardDevice[]=[];
  const seen=new Set<string>();
  for(const automation of automations){
    const device=automation.device;
    const entityId=canonicalAutomationEntityId(device?.entityId);
    if(!device||!entityId||seen.has(entityId))continue;
    seen.add(entityId);
    devices.push({entityId:device.entityId,name:device.name});
  }
  return {
    active,
    devices:devices.slice(0,3),
    hiddenDeviceCount:Math.max(0,devices.length-3),
    metrics:resolveAutomationHighlights(scenario),
    automationSummary:[
      {label:"Status",value:scenario.lifecycle.label || "--"},
      {label:"Last Action",value:scenario.explanation.lastAction || "--"},
      {label:"Next Action",value:scenario.explanation.nextAction || "--"},
    ],
    reason:scenario.explanation.reason,
    activity:{
      lifecycle:scenario.lifecycle.label,
      status:scenario.lifecycle.status,
      icon:getAutomationLifecycleIcon(scenario.lifecycle.status),
      tone:scenario.lifecycle.tone,
      reason:scenario.explanation.reason,
      lastAction:scenario.explanation.lastAction,
      nextAction:scenario.explanation.nextAction,
    },
  };
}
