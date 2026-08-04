import type { KpiTemplate } from "../types/kpi";

export const defaultKpiTemplates: readonly KpiTemplate[] = [

  {
    id: "total_usage",
    title: "Total Usage",
    icon: "mdi:meter-electric",
    category: "energy",
    unit: "Wh",
    defaultEntity: "sensor.main_all_energy_fwd_total",
    defaultEnabled: true,
    entityType: "sensor",
    autoScale: true,
    decimals: 2,
    keywords: ["main_all_energy_fwd_total", "total", "energy"],
  },

  {
    id: "usage",
    title: "Today's Usage",
    icon: "mdi:lightning-bolt",
    category: "energy",
    unit: "Wh",
    defaultEntity: "sensor.today_usage",
    defaultEnabled: true,
    entityType: "sensor",
    autoScale: true,
    decimals: 2,
    keywords: ["today", "usage", "daily", "energy"],
  },

  {
    id: "power",
    title: "Current Power",
    icon: "mdi:flash",
    category: "energy",
    unit: "W",
    defaultEntity: "sensor.main_all_power_rt",
    defaultEnabled: true,
    entityType: "sensor",
    autoScale: true,
    decimals: 2,
    keywords: ["main_all_power_rt", "current", "power"],
  },

  {
    id: "solar_generation",
    title: "Solar Generation",
    icon: "mdi:solar-power",
    category: "solar",
    unit: "W",
    defaultEntity: "sensor.solar_power",
    defaultEnabled: true,
    entityType: "sensor",
    autoScale: true,
    decimals: 2,
    keywords: ["solar", "generation", "power"],
  },

  {
    id: "cost",
    title: "Today's Cost",
    icon: "mdi:currency-eur",
    category: "cost",
    unit: "€",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 2,
  },

  {
    id: "peak_power",
    title: "Peak Power",
    icon: "mdi:flash-circle",
    category: "energy",
    unit: "W",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: true,
    decimals: 2,
  },

  {
    id: "solar_self_consumption",
    title: "Solar Self Consumption",
    icon: "mdi:solar-power",
    category: "solar",
    unit: "%",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 1,
  },

  {
    id: "renewable_ratio",
    title: "Renewable",
    icon: "mdi:leaf",
    category: "carbon",
    unit: "%",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 1,
  },

  {
    id: "grid_import",
    title: "Grid Import",
    icon: "mdi:download",
    category: "grid",
    unit: "Wh",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: true,
    decimals: 2,
  },

  {
    id: "grid_export",
    title: "Grid Export",
    icon: "mdi:upload",
    category: "grid",
    unit: "Wh",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: true,
    decimals: 2,
  },

  {
    id: "carbon_saved",
    title: "Carbon Saved",
    icon: "mdi:leaf",
    category: "carbon",
    unit: "kg",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 2,
  },

  {
    id: "monthly_cost",
    title: "Monthly Cost",
    icon: "mdi:currency-eur",
    category: "cost",
    unit: "€",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 2,
  },

  {
    id: "efficiency_score",
    title: "Energy Efficiency Score",
    icon: "mdi:star-outline",
    category: "efficiency",
    unit: "",
    defaultEntity: "",
    defaultEnabled: false,
    entityType: "sensor",

    autoScale: false,
    decimals: 0,
  }

] as const;

/**
 * Compatibility export for existing picker imports.
 * New code should use defaultKpiTemplates.
 */
export const availableKPIs = defaultKpiTemplates;
