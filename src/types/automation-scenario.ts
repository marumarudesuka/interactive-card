export type AutomationScenarioStatus =
  | "running"
  | "waiting"
  | "scheduled"
  | "completed"
  | "paused"
  | "blocked"
  | "disabled"
  | "unknown";

export interface AutomationServiceAction {
  domain?: string;
  service?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export interface AutomationScenarioActions {
  pause?: AutomationServiceAction;
  run_now?: AutomationServiceAction;
  stop?: AutomationServiceAction;
}

export interface EnergyAutomationCardConfig {
  type?: string;
  title?: string;
  icon?: string;
  status_entity: string;
  strategy_entity: string;
  reason_entity: string;
  target_time_entity: string;
  manual_override_entity: string;
  device_entity: string;
  power_entity?: string;
  temperature_entity?: string;
  target_temperature_entity?: string;
  automation_entity?: string;
  estimated_finish_entity?: string;
  last_action_entity?: string;
  device_name?: string;
  description?: string;
  labels?: {
    current_device?: string;
    target_time?: string;
    heating_strategy?: string;
    water_temperature?: string;
    current_power?: string;
    device_status?: string;
    manual_override?: string;
  };
  show?: {
    power?: boolean;
    temperature?: boolean;
    strategy?: boolean;
    device?: boolean;
    next_action?: boolean;
    last_action?: boolean;
  };
  actions?: AutomationScenarioActions;
}

export interface AutomationStatusPresentation {
  status: AutomationScenarioStatus;
  label: string;
  icon: string;
  tone: "success" | "waiting" | "complete" | "paused" | "blocked" | "disabled";
}

export interface AutomationStrategyPresentation {
  label: string;
  icon: string;
  tone: "solar" | "grid" | "wait" | "neutral";
}

export interface AutomationScenarioViewModel {
  title: string;
  icon: string;
  status: AutomationStatusPresentation;
  strategy: AutomationStrategyPresentation;
  reason: string;
  targetTime: string;
  estimatedFinish: string;
  deviceName: string;
  deviceStateLabel: string;
  deviceAvailable: boolean;
  deviceOn: boolean;
  powerValue: string;
  powerUnit: string;
  temperatureValue: string;
  temperatureUnit: string;
  targetTemperatureValue: string;
  manualOverride: boolean;
  manualOverrideAvailable: boolean;
  strategyAvailable: boolean;
  targetAvailable: boolean;
  nextActionAvailable: boolean;
  lastActionAvailable: boolean;
  automationEnabled: boolean;
  lastAction: string;
  lastActionTime: string;
}
