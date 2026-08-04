import type {
  SceneChartSeries,
  SceneHistoryEntry,
  SceneInsight,
  SceneMetric,
} from "../types/scenes";

export const evMetrics: SceneMetric[] = [
  { title:"Energy Added", value:"24.6", unit:"kWh", icon:"mdi:battery-charging" },
  { title:"Charging Time", value:"3h 25m", icon:"mdi:timer-outline" },
  { title:"Charging Cost", value:"4.80", unit:"$", icon:"mdi:currency-usd" },
  { title:"Average Power", value:"7.1", unit:"kW", icon:"mdi:flash" },
];
export const evSeries: SceneChartSeries[] = [
  { name:"Charging Power", color:"var(--en-color-primary)", values:[0,0,2.8,6.9,7.2,7.1,6.8,4.2,0] },
];
export const evHistory: SceneHistoryEntry[] = [
  { title:"Today", subtitle:"18:42–22:07", values:["24.6 kWh","$4.80","3h 25m"] },
  { title:"Jul 28", subtitle:"00:15–03:04", values:["18.2 kWh","$3.12","2h 49m"] },
  { title:"Jul 25", subtitle:"19:20–23:18", values:["28.7 kWh","$5.44","3h 58m"] },
];
export const evInsight: SceneInsight = {
  severity:"success", title:"Off-peak charging",
  description:"Your EV charging mostly happens during off-peak hours.",
  icon:"mdi:clock-check-outline",
};

export const solarMetrics: SceneMetric[] = [
  { title:"Generation Today", value:"18.4", unit:"kWh", icon:"mdi:solar-power" },
  { title:"Self Consumption", value:"62", unit:"%", icon:"mdi:home-lightning-bolt" },
  { title:"Grid Export", value:"6.8", unit:"kWh", icon:"mdi:transmission-tower-export" },
  { title:"Efficiency", value:"91", unit:"%", icon:"mdi:gauge" },
];
export const solarSeries: SceneChartSeries[] = [
  { name:"Solar Production", color:"var(--en-color-accent)", values:[0,0,.3,1.4,3.8,5.8,5.1,3.2,1.1,.1,0] },
  { name:"Home Consumption", color:"var(--en-color-primary)", values:[1.1,.8,.9,1.4,2.1,2.7,3.5,2.8,2.4,1.9,1.3] },
];
export const solarInsight: SceneInsight = {
  severity:"achievement", title:"Strong solar coverage",
  description:"Solar covered 62% of your home usage today.",
  icon:"mdi:white-balance-sunny",
};

export const batteryMetrics: SceneMetric[] = [
  { title:"Stored Energy", value:"9.7", unit:"kWh", icon:"mdi:battery-high" },
  { title:"Cycles", value:"184", icon:"mdi:sync" },
  { title:"Efficiency", value:"94", unit:"%", icon:"mdi:gauge" },
  { title:"Throughput", value:"3.2", unit:"MWh", icon:"mdi:swap-horizontal" },
];
export const batterySeries: SceneChartSeries[] = [
  { name:"Battery Power", color:"var(--en-color-success)", values:[-2.1,-1.4,0,.8,2.5,1.8,.2,-1.1,-2.4,-.8,0] },
  { name:"Battery Level", color:"var(--en-color-primary)", values:[48,44,43,49,61,72,78,74,65,59,58] },
];
export const batteryInsight: SceneInsight = {
  severity:"normal", title:"Storage is balanced",
  description:"The battery has enough reserve to support tonight's peak period.",
  icon:"mdi:battery-heart-variant",
};

export const applianceMetrics: SceneMetric[] = [
  { title:"Air Conditioner", value:"2.4", unit:"kW", icon:"mdi:air-conditioner" },
  { title:"Water Heater", value:"1.8", unit:"kW", icon:"mdi:water-boiler" },
  { title:"Kitchen", value:"500", unit:"W", icon:"mdi:stove" },
  { title:"EV", value:"320", unit:"W", icon:"mdi:car-electric" },
];
export const applianceSeries: SceneChartSeries[] = [
  { name:"AC", color:"var(--en-color-primary)", values:[0,.3,1.8,2.4,2.1,.8,0,1.4,2.2,.5,0] },
  { name:"Kitchen", color:"var(--en-color-accent)", values:[0,0,.2,.8,.3,0,0,.6,1.1,.2,0] },
];
export const applianceInsight: SceneInsight = {
  severity:"warning", title:"Higher AC consumption",
  description:"AC consumed 35% more energy than usual.",
  icon:"mdi:alert-circle-outline",
};

export const petMetrics: SceneMetric[] = [
  { title:"Aquarium", value:"45", unit:"W", icon:"mdi:fishbowl-outline" },
  { title:"Pet Fountain", value:"8", unit:"W", icon:"mdi:water-pump" },
  { title:"Automatic Feeder", value:"5", unit:"W", icon:"mdi:bowl-mix-outline" },
  { title:"Monthly Pet Energy", value:"18.4", unit:"kWh", icon:"mdi:paw" },
];
export const petInsight: SceneInsight = {
  severity:"normal", title:"Pet energy summary",
  description:"This month your pets used 18.4 kWh.",
  icon:"mdi:paw",
};
