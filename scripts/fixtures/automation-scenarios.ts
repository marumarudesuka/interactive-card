import type { EnergyAutomationSectionConfig } from "../../src/automation/automation-scenario.types.ts";

export const automationRuntimeDemoFixture:EnergyAutomationSectionConfig = {
  type:"custom:energy-automation-section",
  title:"Automation",
  scenarios:[
    {
      id:"pet-care", template:"custom", title:"Pet Care", icon:"mdi:paw",
      status_entity:"input_select.pet_status",
      strategy:{ entity:"input_select.pet_mode", label:"Care Mode" },
      metrics:[
        { entity:"input_select.feeding_status", label:"Feeding", format:"text" },
        { entity:"input_number.food_remaining", label:"Food Remaining", format:"number" },
        { entity:"input_number.pet_room_temperature", label:"Room Temperature", format:"number" },
      ],
      settings:[
        { id:"care-mode", label:"Care Mode", entity:"input_select.pet_mode", control:"auto" },
        { id:"override", label:"Manual Override", entity:"input_boolean.pet_override", control:"auto" },
      ],
      automation_groups:[
        { id:"feeding", label:"Feeding", automations:[
          { id:"scheduled-feeding", entity:"automation.scheduled_feeding", name:"Scheduled Feeding" },
          { id:"manual-feed", entity:"automation.manual_feed", name:"Manual Feed" },
          { id:"feeder-offline", entity:"automation.feeder_offline", name:"Feeder Offline" },
        ] },
        { id:"environment", label:"Environment", automations:[
          { id:"ac-control", entity:"automation.ac_temperature_control", name:"AC Temperature Control" },
          { id:"temperature-protection", entity:"automation.temperature_protection", name:"Temperature Protection" },
        ] },
        { id:"monitoring", label:"Monitoring", automations:[
          { id:"activity-monitoring", entity:"automation.activity_monitoring", name:"Activity Monitoring" },
        ] },
      ],
    },
    {
      id:"solar-water", template:"solar_water_heating", status_entity:"input_select.solar_status",
      automation_groups:[{ id:"heating", label:"Heating", automations:[
        { id:"scheduled-heating", entity:"automation.scheduled_solar_heating", name:"Scheduled Heating" },
        { id:"temperature-protection", entity:"automation.solar_temperature_protection", name:"Temperature Protection" },
      ] }],
    },
  ],
};
