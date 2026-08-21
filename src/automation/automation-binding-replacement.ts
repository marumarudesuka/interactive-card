import type {AutomationScenarioConfig} from "./automation-scenario.types.ts";
import {canonicalAutomationEntityId} from "./automation-entity-identity.ts";

export function replaceScenarioEntityBinding(scenario:AutomationScenarioConfig,previous:string,next:string):AutomationScenarioConfig{
  const from=canonicalAutomationEntityId(previous),to=canonicalAutomationEntityId(next);
  if(!from||!to||from===to)return scenario;
  const visit=(value:unknown):unknown=>{
    if(typeof value==="string"){
      if(canonicalAutomationEntityId(value)===from)return to;
      if(value===`metric:${from}`)return `metric:${to}`;
      return value;
    }
    if(Array.isArray(value))return value.map(visit);
    if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visit(item)]));
    return value;
  };
  return visit(scenario) as AutomationScenarioConfig;
}

export function collectScenarioEntityBindings(scenario:AutomationScenarioConfig):string[]{
  const found:string[]=[];const seen=new Set<string>();
  const visit=(value:unknown,key="")=>{
    if(typeof value==="string"){
      if(key.includes("service")||key==="id"||key==="type")return;
      const entity=canonicalAutomationEntityId(value);
      if(/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entity)&&!seen.has(entity)){seen.add(entity);found.push(entity);}
      return;
    }
    if(Array.isArray(value)){value.forEach(item=>visit(item,key));return;}
    if(value&&typeof value==="object")for(const [childKey,item] of Object.entries(value))visit(item,childKey);
  };
  visit(scenario);return found;
}
