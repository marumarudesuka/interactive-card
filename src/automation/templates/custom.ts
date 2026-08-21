import type { AutomationScenarioTemplate } from "../automation-template.types.ts";

export const customAutomationTemplate: AutomationScenarioTemplate = {
  id:"custom",
  name:"Custom",
  identityDefaults:{ title:"Automation Scenario", subtitle:"", icon:"mdi:robot-outline" },
  statusMappings:{},
  strategyMappings:{},
  metricRecommendations:[],
  actionRecommendations:[],
  visibilityDefaults:{ plan:false, decision_factors:false },
};
