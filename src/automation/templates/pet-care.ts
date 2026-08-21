import type { AutomationScenarioTemplate } from "../automation-template.types.ts";

export const petCareTemplate:AutomationScenarioTemplate = {
  id:"pet-care",
  name:"Pet Care",
  identityDefaults:{ title:"Pet Care",subtitle:"Smart pet care and feeding",icon:"mdi:paw" },
  statusMappings:{
    feeding:"running",
    cooling:"running",
    monitoring:"waiting",
    completed:"completed",
    feeding_complete:"completed",
    feeding_completed:"completed",
    waiting:"waiting",
    scheduled:"scheduled",
    paused:"paused",
    low_food:"blocked",
    warning:"blocked",
    offline:"unavailable",
    unavailable:"unavailable",
    disabled:"disabled",
    unknown:"unknown",
  },
  strategyMappings:{},
  metricRecommendations:[
    { label:"Feeding Status",icon:"mdi:bowl",format:"auto",role:"secondary" },
    { label:"Food Remaining",icon:"mdi:food-drumstick",format:"number",role:"secondary" },
    { label:"Room Temperature",icon:"mdi:thermometer",format:"number",role:"secondary" },
  ],
  settingRecommendations:[
    { id:"care-mode",label:"Care Mode",control:"select",format:"auto",role:"scenario" },
    { id:"manual-override",label:"Manual Override",control:"toggle",format:"auto",role:"manual_override" },
  ],
  automationGroupRecommendations:[
    { id:"feeding",label:"Feeding" },
    { id:"environment",label:"Environment" },
    { id:"monitoring",label:"Monitoring" },
  ],
  actionRecommendations:[
    { id:"feed-now",label:"Feed Now",tone:"primary",group_id:"feeding" },
  ],
  visibilityDefaults:{ plan:false,decision_factors:false },
};
