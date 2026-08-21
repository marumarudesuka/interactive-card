import type { NormalizedAutomationScenario,NormalizedScenarioMetric,NormalizedScenarioValue } from "./automation-scenario.types.ts";
import { canonicalAutomationEntityId } from "./automation-entity-identity.ts";

export interface AutomationHighlightCandidate extends NormalizedScenarioValue {
  id:string;
  source:string;
  canonicalIdentity:string;
  iconColor?:string;
}

const entityKey=(entity:string|undefined)=>`entity:${canonicalAutomationEntityId(entity)}`;
const candidate=(id:string,source:string,identity:string,value:NormalizedScenarioValue,iconColor?:string):AutomationHighlightCandidate=>({id,source,canonicalIdentity:identity,...value,iconColor});

export function collectAutomationHighlightCandidates(scenario:NormalizedAutomationScenario,deduplicate=true):AutomationHighlightCandidate[]{
  const items:AutomationHighlightCandidate[]=[];
  for(const metric of scenario.metrics) items.push(candidate(metric.highlightId,"Live Metrics",entityKey(metric.entityId),metric,metric.iconColor));
  items.push(candidate("scenario:status","Scenario","scenario:status",{label:"Status",value:scenario.lifecycle.label,available:scenario.lifecycle.status!=="unavailable"}));
  const bindingValue=(status:string,value:string|undefined)=>status==="unavailable"?"Unavailable":status==="unknown"?"Unknown":value||"--";
  const explanation=[
    ["reason","Current Decision",scenario.explanation.bindings.reason,scenario.explanation.reason],
    ["next-action","Next Action",scenario.explanation.bindings.nextAction,scenario.explanation.nextAction],
    ["last-action","Last Action",scenario.explanation.bindings.lastAction,scenario.explanation.lastAction],
  ] as const;
  for(const [id,label,binding,value] of explanation) if(binding.status!=="not_configured"&&binding.entityId) items.push(candidate(`scenario:${id}`,"Activity Bindings",entityKey(binding.entityId),{label,value:bindingValue(binding.status,value),available:binding.status==="valid"}));
  for(const setting of scenario.settings) items.push(candidate(`setting:${setting.id}`,"Scenario Controls",entityKey(setting.entityId),setting));
  if(scenario.progress){
    const [current,target]=scenario.progress.sourceEntityIds;
    items.push(candidate("progress:current","Progress",entityKey(current),{label:scenario.progress.currentLabel,value:scenario.progress.currentValue,available:scenario.progress.currentAvailable}));
    items.push(candidate("progress:target","Progress",entityKey(target),{label:scenario.progress.targetLabel,value:scenario.progress.targetValue,available:scenario.progress.targetAvailable}));
  }
  if(scenario.decisionContext){
    const [observed,threshold]=scenario.decisionContext.sourceEntityIds;
    items.push(candidate("decision:observed","Decision Context",entityKey(observed),{label:scenario.decisionContext.observedLabel,value:scenario.decisionContext.observedValue,available:scenario.decisionContext.available}));
    items.push(candidate("decision:threshold","Decision Context",entityKey(threshold),{label:scenario.decisionContext.thresholdLabel,value:scenario.decisionContext.thresholdValue,available:scenario.decisionContext.available}));
  }
  if(scenario.nextDecision) items.push(candidate("scenario:next-decision","Scenario",`scenario:next-decision`,{label:"Next Decision",value:[scenario.nextDecision.time,scenario.nextDecision.label].filter(Boolean).join(" · ")||"--",available:Boolean(scenario.nextDecision.time||scenario.nextDecision.label)}));
  for(const group of scenario.automationGroups) for(const automation of group.automations){
    const prefix=`automation:${group.id}/${automation.id}`;
    for(const [key,value] of [["current",automation.current],["next",automation.next],["last",automation.last]] as const) if(value) items.push(candidate(`${prefix}/${key}`,group.label,entityKey(value.entityId),value));
    for(const parameter of automation.parameters) items.push(candidate(`${prefix}/parameter/${parameter.id}`,group.label,entityKey(parameter.entityId),parameter));
    if(automation.device) items.push(candidate(`${prefix}/device`,group.label,entityKey(automation.device.entityId),{label:automation.device.name,value:automation.device.state,available:automation.device.available,icon:automation.device.icon}));
  }
  if(!deduplicate)return items;
  const seen=new Set<string>();
  return items.filter(item=>{if(seen.has(item.canonicalIdentity))return false;seen.add(item.canonicalIdentity);return true;});
}

export function resolveAutomationHighlights(scenario:NormalizedAutomationScenario):AutomationHighlightCandidate[]{
  if(!scenario.dashboard)return scenario.metrics.slice(0,3).map((metric:NormalizedScenarioMetric)=>candidate(metric.highlightId,"Live Metrics",entityKey(metric.entityId),metric,metric.iconColor));
  const byId=new Map(collectAutomationHighlightCandidates(scenario,false).map(item=>[item.id,item]));
  const resolved=scenario.dashboard.highlights.map(id=>byId.get(id)).filter((item):item is AutomationHighlightCandidate=>Boolean(item));
  if(resolved.length===scenario.dashboard.highlights.length)return resolved;
  const seen=new Set(resolved.map(item=>item.canonicalIdentity));
  for(const metric of scenario.metrics){
    const fallback=candidate(metric.highlightId,"Live Metrics",entityKey(metric.entityId),metric,metric.iconColor);
    if(seen.has(fallback.canonicalIdentity))continue;
    resolved.push(fallback);seen.add(fallback.canonicalIdentity);
    if(resolved.length>=scenario.dashboard.highlights.length)break;
  }
  return resolved;
}
