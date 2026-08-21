export type AutomationTemplateId = "solar_water_heating" | "ev_smart_charging" | "custom" | (string & {});

export type LifecycleStatus =
  | "running" | "waiting" | "scheduled" | "paused" | "completed"
  | "blocked" | "disabled" | "unavailable" | "unknown";

export type ScenarioTone = "primary" | "accent" | "success" | "warning" | "critical" | "neutral";
export type ScenarioValueFormat = "auto" | "text" | "number" | "power" | "energy" | "temperature" | "percentage" | "time" | "datetime" | "duration";
export type ScenarioMetricRole = "primary" | "secondary" | "progress" | "constraint";
export type PlanStepStatus = "completed" | "current" | "upcoming" | "skipped" | "blocked" | "unavailable";
export type ScenarioSettingControl = "auto" | "toggle" | "select" | "number" | "time" | "datetime";
export type ScenarioSettingChangeMode = "direct" | "next_run";
export type ScenarioBindingRole = "scenario" | "device" | "observed" | "manual_override";

export interface ScenarioIdentityConfig { title?: string; subtitle?: string; icon?: string; }
export interface ScenarioGoalConfig { entity: string; label?: string; icon?: string; format?: ScenarioValueFormat; description?: string; }
export interface StrategyMappingConfig { label?: string; icon?: string; tone?: ScenarioTone; description?: string; }
export interface ScenarioStrategyConfig { entity: string; label?: string; mappings?: Record<string, StrategyMappingConfig>; presentation?:"select"|"segmented"; }
export interface ScenarioMetricConfig { entity: string; label?: string; icon?: string; icon_color?: string; format?: ScenarioValueFormat; role?: ScenarioMetricRole; visible?: boolean; }
export interface ScenarioDashboardConfig { highlights?: string[]; }
export interface ExecutionStateMapping { label?: string; active?: boolean; tone?: ScenarioTone; }
export interface ScenarioDeviceControlConfig { type: "switch"; turn_on_service?: string; turn_off_service?: string; confirmation?: boolean; }
export interface ScenarioExecutionConfig { entity: string; label?: string; icon?: string; state_mappings?: Record<string, ExecutionStateMapping>; control?: ScenarioDeviceControlConfig; }
export interface AutomationPlanStepConfig { id: string; label: string; icon?: string; status?: PlanStepStatus; status_entity?: string; status_mappings?: Record<string, PlanStepStatus>; description?: string; detail_entity?: string; lifecycle_states?: LifecycleStatus[]; }
export interface AutomationPlanConfig { current_step_entity?: string; steps?: AutomationPlanStepConfig[]; }
export interface ScenarioDecisionFactorConfig { entity: string; label?: string; format?: ScenarioValueFormat; influence?: "supports" | "limits" | "blocks" | "informational"; }
export interface ScenarioDecisionContextConfig { summary_entity?: string; factors?: ScenarioDecisionFactorConfig[]; observed_entity?:string; threshold_entity?:string; threshold?:number; observed_label?:string; threshold_label?:string; message_entity?:string; }
export interface ScenarioExplanationConfig { reason_entity?: string; next_action_entity?: string; last_action_entity?: string; decision_context?: ScenarioDecisionContextConfig; }
export interface ScenarioProgressConfig { current_entity?:string; target_entity?:string; label?:string; current_label?:string; target_label?:string; remaining_label?:string; estimated_entity?:string; unit?:string; mode?:"target"|"threshold"; min?:number; max?:number; }
export interface ScenarioNextDecisionConfig { time_entity?:string; label_entity?:string; condition_entity?:string; time?:string; label?:string; condition?:string; }
export interface ScenarioActionConfig { id: string; label?: string; icon?: string; tone?: "primary" | "neutral" | "destructive"; service?: string; target_entity?: string; script_entity?: string; group_id?: string; data?: Record<string, unknown>; confirmation?: boolean; available_when?: LifecycleStatus[]; }
export interface ScenarioValueBinding { entity: string; label?: string; icon?: string; format?: ScenarioValueFormat; description?: string; }
export interface ScenarioSettingOverrideConfig { value_entity: string; active_entity: string; }
export interface ScenarioSettingConfig extends ScenarioValueBinding {
  id: string;
  role?: ScenarioBindingRole;
  control?: ScenarioSettingControl;
  change_mode?: ScenarioSettingChangeMode;
  scope?: "scenario" | "device";
  override?: ScenarioSettingOverrideConfig;
}
export interface LinkedAutomationParameterConfig extends ScenarioValueBinding { id: string; }
export interface ScenarioDeviceReference { entity: string; name?: string; icon?: string; }
export interface AutomationEditorTarget { automation_config_id: string; }
export interface LinkedAutomationConfig {
  id: string;
  entity: string;
  name?: string;
  description?: string;
  enabled_entity?: string;
  parameters?: LinkedAutomationParameterConfig[];
  device?: ScenarioDeviceReference;
  current?: ScenarioValueBinding;
  next?: ScenarioValueBinding;
  last?: ScenarioValueBinding;
  quick_actions?: ScenarioActionConfig[];
  editor_target?: AutomationEditorTarget;
}
export interface AutomationGroupConfig { id: string; label: string; icon?: string; automations: LinkedAutomationConfig[]; }

export interface AutomationScenarioVisibilityConfig {
  identity?: boolean; lifecycle?: boolean; goals?: boolean; primary_goal?: boolean;
  secondary_goal?: boolean; strategy?: boolean; metrics?: boolean; execution?: boolean;
  device_control?: boolean; manual_override?: boolean; plan?: boolean; explanation?: boolean;
  reason?: boolean; next_action?: boolean; last_action?: boolean; decision_factors?: boolean;
  controls?: boolean;
}

export interface AutomationScenarioConfig {
  type?: string;
  id?: string;
  visible?: boolean;
  template?: AutomationTemplateId;
  identity?: ScenarioIdentityConfig;
  title?: string;
  subtitle?: string;
  icon?: string;
  status_entity: string;
  reason_entity?: string;
  strategy?: ScenarioStrategyConfig;
  strategy_entity?: string;
  automation_entity?: string;
  goal?: ScenarioGoalConfig;
  secondary_goal?: ScenarioGoalConfig;
  execution?: ScenarioExecutionConfig;
  device_entity?: string;
  manual_override_entity?: string;
  metrics?: ScenarioMetricConfig[];
  dashboard?: ScenarioDashboardConfig;
  plan?: AutomationPlanConfig;
  explanation?: ScenarioExplanationConfig;
  progress?:ScenarioProgressConfig;
  next_decision?:ScenarioNextDecisionConfig;
  next_action_entity?: string;
  last_action_entity?: string;
  actions?: ScenarioActionConfig[];
  settings?: ScenarioSettingConfig[];
  automation_groups?: AutomationGroupConfig[];
  status_mappings?: Record<string, LifecycleStatus>;
  strategy_mappings?: Record<string, StrategyMappingConfig>;
  show?: AutomationScenarioVisibilityConfig;
}

export interface NormalizedAutomationScenarioConfig {
  type: "custom:energy-automation-card";
  id: string;
  visible:boolean;
  templateId: AutomationTemplateId;
  identity: Required<ScenarioIdentityConfig>;
  statusEntity: string;
  reasonEntity?: string;
  automationEntity?: string;
  goals: Array<ScenarioGoalConfig & { id: "primary" | "secondary" }>;
  strategy?: ScenarioStrategyConfig;
  metrics: ScenarioMetricConfig[];
  dashboard?: { highlights:string[] };
  execution?: ScenarioExecutionConfig;
  manualOverrideEntity?: string;
  plan?: AutomationPlanConfig;
  explanation: ScenarioExplanationConfig;
  progress?:ScenarioProgressConfig;
  nextDecision?:ScenarioNextDecisionConfig;
  actions: ScenarioActionConfig[];
  settings: ScenarioSettingConfig[];
  automationGroups: AutomationGroupConfig[];
  statusMappings: Record<string, LifecycleStatus>;
  strategyMappings: Record<string, StrategyMappingConfig>;
  visibility: Required<AutomationScenarioVisibilityConfig>;
}

export interface NormalizedScenarioValue { label: string; icon?: string; value: string; unit?: string; available: boolean; }
export interface NormalizedScenarioGoal extends NormalizedScenarioValue { id: "primary" | "secondary"; description?: string; }
export interface NormalizedScenarioMetric extends NormalizedScenarioValue { entityId: string; role: ScenarioMetricRole; iconColor?: string; highlightId:string; }
export interface NormalizedAutomationPlanStep { id: string; label: string; icon?: string; description?: string; detail?: string; status: PlanStepStatus; }
export interface NormalizedAutomationPlan { currentStepId?: string; currentStepIndex?: number; steps: NormalizedAutomationPlanStep[]; }
export interface NormalizedScenarioAction extends ScenarioActionConfig { label: string; tone: "primary" | "neutral" | "destructive"; available: boolean; }
export interface EnergyAutomationSectionConfig { type?: "custom:energy-automation-section"; title?: string; scenarios: AutomationScenarioConfig[]; }
export interface NormalizedEnergyAutomationSectionConfig { type: "custom:energy-automation-section"; title: string; scenarios: NormalizedAutomationScenarioConfig[]; }
export interface ResolvedScenarioSetting extends NormalizedScenarioValue {
  id: string;
  entityId: string;
  control: Exclude<ScenarioSettingControl, "auto"> | "unsupported";
  changeMode:ScenarioSettingChangeMode;
  scope?:"scenario"|"device";
  role?:ScenarioBindingRole;
  presentation?:"select"|"segmented";
  rawValue: string;
  regularValue:string;
  regularRawValue:string;
  regularAvailable:boolean;
  effectiveValue:string;
  effectiveRawValue:string;
  overrideActive:boolean;
  overrideValue?:string;
  overrideAvailable:boolean;
  overrideState:"not_configured"|"missing"|"unavailable"|"inactive"|"active";
  override?:{
    valueEntityId:string;
    activeEntityId:string;
    active:boolean;
    available:boolean;
    value:string;
    rawValue:string;
  };
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  entityDomain?:string;
  entityAttributes?:Record<string,unknown>;
}
export interface ResolvedLinkedAutomationParameter extends NormalizedScenarioValue { id: string; entityId: string; rawValue: string; }
export interface ResolvedLinkedAutomationValue extends NormalizedScenarioValue { entityId:string; }
export interface ResolvedLinkedAutomation {
  id: string; entityId: string; name: string; description?: string; available: boolean;
  enabled: boolean; enabledAvailable: boolean; parameters: ResolvedLinkedAutomationParameter[];
  device?: { entityId: string; name: string; icon?: string; state: string; available: boolean; domain:string; attributes:Record<string,unknown> };
  current?: ResolvedLinkedAutomationValue; next?: ResolvedLinkedAutomationValue; last?: ResolvedLinkedAutomationValue;
  quickActions: NormalizedScenarioAction[]; editorTarget?: AutomationEditorTarget;
}
export interface ResolvedAutomationGroup { id: string; label: string; icon?: string; automations: ResolvedLinkedAutomation[]; }
export type ScenarioExplanationBindingStatus = "not_configured" | "missing" | "unavailable" | "unknown" | "valid";
export interface ResolvedScenarioExplanationBinding { entityId?: string; status: ScenarioExplanationBindingStatus; value?: string; }
export interface NormalizedAutomationScenario {
  id: string;
  templateId: AutomationTemplateId;
  identity: Required<ScenarioIdentityConfig>;
  lifecycle: { status: LifecycleStatus; label: string; icon: string; tone: ScenarioTone };
  goals: NormalizedScenarioGoal[];
  strategy?: StrategyMappingConfig & { rawValue: string; label: string; icon: string; tone: ScenarioTone; presentation:"select"|"segmented" };
  metrics: NormalizedScenarioMetric[];
  dashboard?: { highlights:string[] };
  settings: ResolvedScenarioSetting[];
  automationGroups: ResolvedAutomationGroup[];
  execution?: { entityId: string; label: string; icon: string; rawState: string; stateLabel: string; active: boolean; tone: ScenarioTone; control?: ScenarioDeviceControlConfig };
  progress?:{label:string;mode:"target"|"threshold";currentLabel:string;currentValue:string;targetLabel:string;targetValue:string;remainingLabel:string;remainingValue:string;estimated?:string;ratio?:number;currentPosition?:number;markerPosition?:number;rangeMinValue?:string;rangeMaxValue?:string;rangeKnown:boolean;currentAvailable:boolean;targetAvailable:boolean;available:boolean;sourceEntityIds:string[]};
  decisionContext?:{observedLabel:string;observedValue:string;thresholdLabel:string;thresholdValue:string;message?:string;differenceValue?:string;difference?:number;available:boolean;currentPosition?:number;markerPosition?:number;sourceEntityIds:string[]};
  nextDecision?:{time?:string;label?:string;condition?:string;sourceEntityIds:string[]};
  plan?: NormalizedAutomationPlan;
  explanation: {
    currentStepId?: string; stateLabel: string; reason?: string; nextAction?: string; lastAction?: string; lastActionTime?: string;
    bindings: { reason:ResolvedScenarioExplanationBinding; nextAction:ResolvedScenarioExplanationBinding; lastAction:ResolvedScenarioExplanationBinding };
  };
  actions: NormalizedScenarioAction[];
  visibility: Required<AutomationScenarioVisibilityConfig>;
}
