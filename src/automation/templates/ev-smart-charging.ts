import type { AutomationScenarioTemplate } from "../automation-template.types.ts";

export const evSmartChargingTemplate: AutomationScenarioTemplate = {
  id:"ev_smart_charging",
  name:"EV Smart Charging",
  identityDefaults:{ title:"Smart EV Charging", subtitle:"Charging around energy cost and departure time.", icon:"mdi:car-electric" },
  goalRecommendations:{
    primary:{ label:"Target SOC", icon:"mdi:battery-charging", format:"percentage" },
    secondary:{ label:"Ready Before", icon:"mdi:clock-outline", format:"time" },
  },
  statusMappings:{ charging:"running", ready:"completed", connected:"waiting" },
  strategyMappings:{
    off_peak:{ label:"Off-Peak Charging", icon:"mdi:clock-outline", tone:"primary" },
    cheapest_tariff:{ label:"Lowest Cost", icon:"mdi:currency-usd", tone:"success" },
    solar:{ label:"Solar Priority", icon:"mdi:white-balance-sunny", tone:"accent" },
  },
  executionMappings:{ charging:{ label:"Charging", active:true, tone:"success" }, off:{ label:"Idle", active:false, tone:"neutral" } },
  metricRecommendations:[
    { label:"Current SOC", icon:"mdi:car-electric", format:"percentage", role:"progress" },
    { label:"Charging Power", icon:"mdi:flash", format:"power", role:"primary" },
  ],
  settingRecommendations:[
    { id:"charging-strategy", label:"Charging Strategy", control:"select", format:"text", role:"scenario" },
    { id:"manual-override", label:"Manual Override", control:"toggle", format:"text", role:"manual_override" },
  ],
  automationGroupRecommendations:[
    { id:"charging", label:"Charging", icon:"mdi:ev-station" },
  ],
  planDefaults:{ steps:[
    { id:"waiting", label:"Waiting", icon:"mdi:clock-outline", lifecycle_states:["waiting","scheduled","paused"] },
    { id:"charging", label:"Smart Charging", icon:"mdi:ev-station", lifecycle_states:["running"] },
    { id:"ready", label:"Ready", icon:"mdi:check-circle-outline", lifecycle_states:["completed"] },
  ] },
  actionRecommendations:[
    { id:"charge_now", label:"Charge Now", icon:"mdi:play", tone:"primary" },
    { id:"pause", label:"Pause", icon:"mdi:pause", tone:"neutral" },
  ],
  visibilityDefaults:{ plan:true, decision_factors:false },
};
