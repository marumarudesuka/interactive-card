export interface CardDefinition {
  id:string;
  title:string;
  category:string;
  icon:string;
  component:string;
}

export const energyCardRegistry: readonly CardDefinition[] = Object.freeze([
  { id:"energy-kpi", title:"Energy KPI", category:"overview", icon:"mdi:gauge", component:"energy-kpi-section" },
  { id:"energy-trend", title:"Energy Trend", category:"analytics", icon:"mdi:chart-line", component:"energy-trend-card" },
  { id:"energy-flow", title:"Energy Flow", category:"overview", icon:"mdi:transit-connection-variant", component:"energy-flow-diagram" },
  { id:"active-circuits", title:"Active Circuits", category:"circuits", icon:"mdi:home-lightning-bolt", component:"energy-circuit-section" },
  { id:"ev-scene", title:"EV Scene", category:"scenes", icon:"mdi:ev-station", component:"energy-ev-charging-scene" },
  { id:"solar-scene", title:"Solar Scene", category:"scenes", icon:"mdi:solar-power", component:"energy-solar-scene" },
  { id:"battery-scene", title:"Battery Scene", category:"scenes", icon:"mdi:battery-charging", component:"energy-battery-scene" },
  { id:"insight", title:"Energy Insight", category:"analytics", icon:"mdi:lightbulb-on-outline", component:"energy-insight-card" },
  { id:"theme-selector", title:"Energy Theme Selector", category:"settings", icon:"mdi:palette", component:"energy-theme-selector" },
  { id:"energy-settings", title:"Energy Settings", category:"settings", icon:"mdi:cog-outline", component:"energy-settings-card" },
  { id:"energy-automation-section", title:"Automation Scenarios", category:"automation", icon:"mdi:robot-outline", component:"energy-automation-section" },
]);

export function getCardDefinition(id: string): CardDefinition | undefined {
  return energyCardRegistry.find((definition) => definition.id === id);
}

export function getCardsByCategory(category: string): CardDefinition[] {
  return energyCardRegistry.filter(
    (definition) => definition.category === category
  );
}

export function publishCardRegistry(): void {
  const target = window as Window & {
    customCards?: Array<{
      type:string;
      name:string;
      description?:string;
    }>;
  };
  const existing = target.customCards ?? [];
  const existingTypes = new Set(existing.map((card) => card.type));
  target.customCards = [
    ...existing,
    ...energyCardRegistry
      .filter((definition) => !existingTypes.has(definition.component))
      .map((definition) => ({
        type:definition.component,
        name:definition.title,
        description:`eNecess ${definition.category} card`,
      })),
  ];
}
