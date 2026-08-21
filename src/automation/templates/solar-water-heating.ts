import type { AutomationScenarioTemplate } from "../automation-template.types.ts";

export const solarWaterHeatingTemplate: AutomationScenarioTemplate = {
  id:"solar_water_heating",
  name:"Solar Water Heating",
  identityDefaults:{ title:"Solar Water Heating", subtitle:"Optimizing hot water with available solar energy.", icon:"mdi:white-balance-sunny" },
  goalRecommendations:{
    primary:{ label:"Target Time", icon:"mdi:clock-outline", format:"time" },
    secondary:{ label:"Target Temperature", icon:"mdi:thermometer", format:"temperature" },
  },
  statusMappings:{ heating:"running", idle:"waiting", ready:"completed" },
  strategyMappings:{
    solar:{ label:"Solar Priority", icon:"mdi:white-balance-sunny", tone:"accent" },
    grid:{ label:"Grid Backup", icon:"mdi:transmission-tower", tone:"primary" },
    wait:{ label:"Waiting", icon:"mdi:clock-outline", tone:"neutral" },
  },
  executionMappings:{ on:{ label:"Heating", active:true, tone:"success" }, off:{ label:"Off", active:false, tone:"neutral" } },
  metricRecommendations:[
    { label:"Water Temperature", icon:"mdi:thermometer", format:"temperature", role:"primary" },
    { label:"Current Power", icon:"mdi:flash", format:"power", role:"primary" },
  ],
  settingRecommendations:[
    { id:"heating-strategy", label:"Heating Strategy", control:"select", format:"text", role:"scenario" },
    { id:"manual-override", label:"Manual Override", control:"toggle", format:"text", role:"manual_override" },
  ],
  automationGroupRecommendations:[
    { id:"heating", label:"Heating", icon:"mdi:radiator" },
  ],
  planDefaults:{ steps:[
    { id:"waiting", label:"Waiting", icon:"mdi:clock-outline", lifecycle_states:["waiting","scheduled","paused"] },
    { id:"heating", label:"Solar Heating", icon:"mdi:white-balance-sunny", lifecycle_states:["running"] },
    { id:"completed", label:"Target Reached", icon:"mdi:check-circle-outline", lifecycle_states:["completed"] },
  ] },
  actionRecommendations:[
    { id:"run_now", label:"Run Now", icon:"mdi:play", tone:"primary" },
    { id:"pause", label:"Pause", icon:"mdi:pause", tone:"neutral" },
    { id:"stop", label:"Stop", icon:"mdi:stop", tone:"destructive" },
  ],
  visibilityDefaults:{ plan:true, decision_factors:false },
};
