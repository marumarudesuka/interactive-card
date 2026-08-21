import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type {
  AutomationGroupConfig, AutomationScenarioConfig, EnergyAutomationSectionConfig,
  LinkedAutomationConfig, LinkedAutomationParameterConfig, ScenarioActionConfig,
  ScenarioMetricConfig, ScenarioSettingConfig, ScenarioValueBinding,
} from "../automation/automation-scenario.types.ts";
import type { FieldValueDetail } from "../components/common/field.ts";
import type { IconChangeDetail } from "../components/common/icon-input.ts";
import type { SelectFieldChangeDetail } from "../components/common/select-field.ts";
import type { EntitySelectedDetail } from "../components/entity-selector.ts";
import { editorLayoutStyles } from "./shared/editor-layout-styles.ts";
import { suppressHaAutomaticCardPreview, type HaAutomaticPreviewSuppression } from "./shared/ha-automatic-preview-suppressor.ts";
import { createLinkedAutomation, createScenarioFromPreset, createStableEditorId, formatEditorCount, getProgressEditorReadiness, getThresholdComparisonEditorReadiness, moveEditorItem, type AutomationScenarioPreset } from "./automation/automation-editor-helpers.ts";
import type { ScenarioCreatedDetail } from "./automation/automation-scenario-creation-flow.ts";
import { normalizeAutomationScenarioConfig } from "../automation/automation-config-normalizer.ts";
import { resolveAutomationScenarioRuntime } from "../automation/automation-runtime-resolver.ts";
import { collectAutomationHighlightCandidates,resolveAutomationHighlights } from "../automation/automation-highlight-candidates.ts";
import { canonicalAutomationEntityId } from "../automation/automation-entity-identity.ts";
import {replaceScenarioEntityBinding} from "../automation/automation-binding-replacement.ts";
import "./automation/automation-scenario-creation-flow.ts";
import "../components/common/button.ts";
import "../components/common/confirm-dialog.ts";
import "../components/common/field.ts";
import "../components/common/icon-input.ts";
import "../components/common/select-field.ts";
import "../components/common/select-item.ts";
import "../components/common/subpage-header.ts";
import "../components/common/app-dialog.ts";
import "../components/entity-selector.ts";

type View =
  | { kind:"section" }
  | { kind:"scenario"; scenarioId:string }
  | { kind:"metric"; scenarioId:string; itemId:string }
  | { kind:"add-control"; scenarioId:string }
  | { kind:"control"; scenarioId:string; itemId:string }
  | { kind:"scenario-status"; scenarioId:string }
  | { kind:"automation-activity"; scenarioId:string }
  | { kind:"activity-footer"; scenarioId:string }
  | { kind:"group"; scenarioId:string; groupId:string }
  | { kind:"automation"; scenarioId:string; groupId:string; automationId:string };
type PickerTarget =
  | { kind:"add-scenario"; preset:AutomationScenarioPreset }
  | { kind:"scenario"; scenarioId:string; field:"status_entity"|"strategy_entity"|"reason_entity"|"next_action_entity"|"last_action_entity"|"goal_entity"|"secondary_goal_entity"|"execution_entity"|"manual_override_entity" }
  | { kind:"add-metric"; scenarioId:string }
  | { kind:"add-control-entity"; scenarioId:string }
  | { kind:"metric"; scenarioId:string; itemId:string }
  | { kind:"setting"; scenarioId:string; itemId:string }
  | { kind:"setting-override"; scenarioId:string; itemId:string; field:"value_entity"|"active_entity" }
  | { kind:"add-automation"; scenarioId:string; groupId:string }
  | { kind:"automation"; scenarioId:string; groupId:string; automationId:string }
  | { kind:"add-parameter"; scenarioId:string; groupId:string; automationId:string }
  | { kind:"parameter"; scenarioId:string; groupId:string; automationId:string; itemId:string }
  | { kind:"binding"; scenarioId:string; groupId:string; automationId:string; field:"enabled"|"device"|"current"|"next"|"last" }
  | { kind:"presentation"; scenarioId:string; field:"progress_current"|"progress_target"|"progress_estimated"|"decision_summary"|"decision_observed"|"decision_threshold"|"decision_message"|"next_time"|"next_label"|"next_condition" }
  | { kind:"scenario-action-target"; scenarioId:string; itemId:string }
  | { kind:"action-target"; scenarioId:string; groupId:string; automationId:string; itemId:string }
  | { kind:"canonical"; scenarioId:string; entityId:string };

type ConfirmTarget = { label:string; title?:string; confirmLabel?:string; run:() => void };
type EditableControlRole = "scenario"|"device"|"manual_override";
type AddControlDraft = { entity:string; label:string; role:EditableControlRole };

const FORMAT_OPTIONS = ["auto","text","number","power","energy","temperature","percentage","time","datetime","duration"].map((value) => ({ value,label:value[0].toUpperCase()+value.slice(1) }));
const CONTROL_OPTIONS = ["auto","toggle","select","number","time","datetime"].map((value) => ({ value,label:value[0].toUpperCase()+value.slice(1) }));
const CONTROL_ROLE_OPTIONS = [
  {value:"scenario",label:"Scenario setting"},
  {value:"device",label:"Device"},
  {value:"manual_override",label:"Override"},
] as const;

function serviceForReplacement(service:string|undefined,entityId:string):string|undefined {
  if (!service||!entityId.includes(".")) return service;
  const [currentDomain,operation]=service.split(".");
  const nextDomain=entityId.split(".",1)[0];
  const compatible:Record<string,readonly string[]>={
    button:["press"],input_button:["press"],switch:["turn_on","turn_off"],input_boolean:["turn_on","turn_off"],
    number:["set_value"],input_number:["set_value"],select:["select_option"],input_select:["select_option"],
  };
  return compatible[currentDomain]?.includes(operation)&&compatible[nextDomain]?.includes(operation)?`${nextDomain}.${operation}`:service;
}

function inferredControlType(entityId:string):string {
  switch(entityId.split(".",1)[0]) {
    case "switch": case "input_boolean": case "fan": case "light": return "Toggle";
    case "select": case "input_select": return "Select";
    case "number": case "input_number": return "Number";
    case "input_datetime": return "Datetime";
    default: return "Unsupported";
  }
}

const displayHighlightSource=(source:string)=>source==="Live Metrics"?"Additional Card Data":source;

export class EnergyAutomationSectionEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, config:{ state:true }, view:{ state:true }, picker:{ state:true },
    creationOpen:{ state:true }, blueprintOpen:{ state:true }, confirmTarget:{ state:true },
    expandedParameterId:{ state:true }, expandedActionId:{ state:true }, expandedSections:{ state:true },
    reorderControlsScenarioId:{ state:true }, addControlDraft:{ state:true },
  };
  hass?:HomeAssistant;
  private config:EnergyAutomationSectionConfig = { type:"custom:energy-automation-section",title:"Automation",scenarios:[] };
  private view:View = { kind:"section" };
  private picker?:PickerTarget;
  private pendingMetricHighlight?:{scenarioId:string;index:number};
  private creationOpen = false;
  private blueprintOpen = false;
  private confirmTarget?:ConfirmTarget;
  private expandedParameterId = "";
  private expandedActionId = "";
  private expandedSections = new Set(["card-display"]);
  private reorderControlsScenarioId = "";
  private addControlDraft?:AddControlDraft;
  private previewSuppression?:HaAutomaticPreviewSuppression;

  connectedCallback() { super.connectedCallback(); this.previewSuppression = suppressHaAutomaticCardPreview(this); }
  disconnectedCallback() { this.previewSuppression?.disconnect(); this.previewSuppression=undefined; super.disconnectedCallback(); }
  setConfig(config:EnergyAutomationSectionConfig) {
    this.config = { ...config,type:"custom:energy-automation-section",title:config.title ?? "Automation",scenarios:(config.scenarios ?? []).map((scenario) => ({ ...scenario })) };
  }

  static styles = [editorLayoutStyles,css`
    :host { --automation-editor-section-gap:10px; --automation-editor-accordion-height:46px; --automation-editor-row-height:46px; --automation-editor-row-padding:2px; --automation-editor-control-gap:8px; --en-editor-section-gap:var(--automation-editor-section-gap); --en-editor-section-content-gap:8px; --en-editor-field-row-gap:10px; --en-editor-field-column-gap:14px; --en-control-height:40px; --en-control-padding-inline:14px; }
    .editor { padding-block:12px 16px; }
    .list { display:grid; min-width:0; gap:0; }
    .item-row { display:grid; min-width:0; min-height:var(--automation-editor-row-height); grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:var(--automation-editor-control-gap); padding:var(--automation-editor-row-padding) 2px var(--automation-editor-row-padding) 0; border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2)); background:transparent; }
    .item-row:last-child { border-bottom:0; }
    .item-row ic-select-item { min-width:0; }
    .row-actions { display:flex; align-items:center; gap:2px; }
    .icon-button { display:grid; width:32px; height:36px; place-items:center; padding:0; border:0; border-radius:8px; background:transparent; color:var(--secondary-text-color); cursor:pointer; }
    .icon-button:hover { background:var(--en-editor-control-surface-hover); color:var(--primary-text-color); }
    .icon-button.destructive:hover { color:var(--error-color); }
    .icon-button ha-icon { width:16px; height:16px; --mdc-icon-size:16px; }
    .empty { padding:8px 0; color:var(--secondary-text-color); font-size:13px; }
    .section-bar { display:flex; min-width:0; align-items:center; justify-content:space-between; gap:12px; }
    .navigation-list { display:grid; min-width:0; }
    .navigation-row { display:grid; width:100%; min-width:0; min-height:var(--automation-editor-accordion-height); grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:10px; box-sizing:border-box; padding:0 4px; border:0; border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2)); background:transparent; color:var(--primary-text-color); cursor:pointer; font:inherit; text-align:left; }
    .navigation-row:last-child { border-bottom:0; }
    .navigation-row:hover { background:var(--en-editor-control-surface-hover); }
    .navigation-label { min-width:0; overflow:hidden; font-size:14px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
    .navigation-summary { color:var(--secondary-text-color); font-size:12px; white-space:nowrap; }
    .navigation-row ha-icon { width:16px; height:16px; --mdc-icon-size:16px; color:var(--secondary-text-color); }
    .accordion-section { display:grid; min-width:0; }
    .accordion-body { display:grid; min-width:0; padding:8px 12px 12px; }
    .accordion-body > .editor-section { gap:6px; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
    .accordion-body .section-heading .section-title { display:none; }
    .accordion-body .section-description { margin:0; }
    .binding-group { display:grid; min-width:0; gap:6px; padding:8px 0; }
    .binding-group + .binding-group { border-top:1px solid var(--divider-color,rgba(127,127,127,.2)); }
    .binding-group-title { color:var(--primary-text-color); font-size:13px; font-weight:600; }
    .editor-subsection { display:grid; min-width:0; gap:10px; padding:10px 2px 12px; }
    .accordion-body > .editor-section.editor-subsection { gap:10px; padding:10px 2px 12px; }
    .editor-subsection + .editor-subsection { border-top:1px solid var(--divider-color,rgba(127,127,127,.2)); }
    .editor-subsection.binding-group { gap:10px; padding:10px 2px 12px; }
    .card-display-regions { padding-inline:2px; }
    .card-display-regions .binding-group { gap:0; padding:0; }
    .card-display-regions .binding-group + .binding-group { border-top:1px solid var(--divider-color,rgba(127,127,127,.2)); }
    .card-display-regions .activity-config-row { min-height:52px; padding-inline:2px; }
    .editor-subsection .item-row { padding-inline-start:2px; }
    .item-editor-dialog { --dialog-width:min(640px,calc(100vw - 32px)); --dialog-header-padding:16px 24px; --dialog-body-padding:16px 24px 24px; }
    .highlight-slots { display:grid; min-width:0; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .highlight-select { min-width:0; }
    .highlight-select ic-select-field { width:100%; min-width:0; }
    .highlight-heading { display:flex; min-width:0; align-items:center; justify-content:space-between; gap:10px; }
    .highlight-mode { display:flex; align-items:center; gap:4px; color:var(--secondary-text-color); font-size:12px; }
    .highlight-reset { padding:2px 3px; border:0; border-radius:6px; background:transparent; color:var(--en-color-primary); font:inherit; font-weight:600; cursor:pointer; }
    .highlight-reset:hover { background:var(--en-editor-control-surface-hover); }
    .activity-config-row { display:grid; width:100%; min-width:0; min-height:var(--automation-editor-row-height); grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px; box-sizing:border-box; padding:0 4px; border:0; background:transparent; color:var(--primary-text-color); font:inherit; text-align:left; cursor:pointer; }
    .activity-config-row:hover { background:var(--en-editor-control-surface-hover); }
    .activity-config-copy { display:grid; min-width:0; gap:2px; }
    .activity-config-name { font-size:13px; font-weight:600; }
    .activity-config-summary { min-width:0; overflow:hidden; color:var(--secondary-text-color); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
    .activity-config-row ha-icon { width:16px; height:16px; --mdc-icon-size:16px; color:var(--secondary-text-color); }
    .control-add-grid { display:grid; min-width:0; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
    .controls-toolbar { display:flex; min-width:0; align-items:center; justify-content:flex-end; padding:0 2px 4px; }
    .text-action { padding:3px 5px; border:0; border-radius:6px; background:transparent; color:var(--en-color-primary); cursor:pointer; font:inherit; font-size:12px; font-weight:600; }
    .text-action:hover { background:var(--en-editor-control-surface-hover); }
    .control-add { display:flex; padding:8px 2px 2px; border-top:1px solid var(--divider-color,rgba(127,127,127,.2)); }
    .control-add .text-action { font-size:13px; }
    .duplicate-notice { display:grid; gap:6px; padding:10px 12px; border-radius:var(--en-control-radius,12px); background:var(--en-editor-control-surface); color:var(--secondary-text-color); font-size:12px; }
    .duplicate-notice strong { color:var(--primary-text-color); font-size:13px; }
    .placement-note { margin:0; color:var(--secondary-text-color); font-size:12px; }
    .item-editor-dialog ic-subpage-header { display:none; }
    .item-editor-dialog .editor { display:grid; gap:0; padding:0; border-top:0; }
    .item-editor-dialog .editor > .editor-section { gap:8px; padding:14px 4px; border:0; border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2)); border-radius:0; background:transparent; box-shadow:none; }
    .item-editor-dialog .editor > .editor-section:first-of-type { padding-top:4px; }
    .item-editor-dialog .editor > .editor-section:last-child { padding-bottom:4px; border-bottom:0; }
    .item-editor-dialog .field-grid { gap:10px 14px; }
    .item-editor-dialog .field-grid > .binding { grid-column:1/-1; }
    .item-editor-dialog .section-title { font-size:13px; font-weight:600; }
    .dialog-destructive { display:flex; justify-content:flex-start; padding-top:14px !important; }
    .dialog-destructive ic-button { --en-control-height-compact:32px; --en-body-size:12px; }
    .scenario-overview { gap:var(--automation-editor-section-gap); }
    .scenario-overview .editor-section { gap:7px; }
    .scenario-overview .identity-grid { display:grid; min-width:0; grid-template-columns:minmax(140px,.8fr) repeat(2,minmax(0,1fr)); align-items:end; gap:10px 14px; }
    .scenario-overview .bindings-grid { gap:10px 14px; }
    .scenario-overview .binding { gap:5px; }
    .scenario-overview .navigation-row { min-height:var(--automation-editor-accordion-height); }
    .accordion-body ic-select-item { --ic-select-item-height:40px; --ic-select-item-padding:3px 6px; }
    .accordion-body ic-button { --en-control-height-compact:30px; --en-control-padding-inline-compact:11px; --en-body-size:12px; }
    .binding { display:grid; min-width:0; gap:4px; }
    .binding-label { color:var(--primary-text-color); font-size:13px; font-weight:600; }
    .binding-control { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px; }
    .binding-value { min-width:0; min-height:40px; overflow:hidden; padding:7px 11px; border:var(--ic-border-control); border-radius:var(--en-control-radius,12px); background:var(--en-editor-control-surface); color:var(--secondary-text-color); font-size:12px; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
    .binding-value.friendly { display:grid; align-content:center; gap:1px; text-align:left; white-space:normal; }
    .binding-friendly-name,.binding-entity-id { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .binding-friendly-name { color:var(--primary-text-color); font-size:13px; font-weight:500; }
    .binding-entity-id { color:var(--secondary-text-color); font-size:11px; }
    .nested-editor { display:grid; gap:8px; margin:2px 0 6px; padding:8px 10px; border-left:2px solid var(--en-color-primary); background:color-mix(in srgb,var(--en-color-primary) 4%,transparent); }
    .template-list { display:grid; gap:8px; padding:4px; }
    .dialog-copy { margin:0; padding:4px; color:var(--secondary-text-color); font-size:13px; line-height:1.5; }
    .picker { display:grid; gap:12px; min-width:0; padding:4px; }
    .picker-actions { display:flex; justify-content:flex-end; }
    .danger { color:var(--error-color); }
    .color-control { display:grid; min-width:0; gap:6px; }
    .color-label { color:var(--primary-text-color); font-size:13px; font-weight:600; }
    .color-row { display:grid; min-height:40px; min-width:0; grid-template-columns:auto minmax(0,1fr) auto auto; align-items:center; gap:10px; box-sizing:border-box; padding:0 12px; border:var(--ic-border-control); border-radius:var(--en-control-radius,12px); background:var(--en-editor-control-surface); }
    .color-swatch { width:18px; height:18px; border-radius:50%; background:var(--metric-editor-color,var(--en-surface-icon-primary,var(--en-color-primary))); box-shadow:inset 0 0 0 1px var(--en-editor-control-border); }
    .color-mode { min-width:0; overflow:hidden; color:var(--secondary-text-color); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
    .color-input { width:28px; height:28px; padding:0; border:0; background:transparent; cursor:pointer; }
    @container (max-width:599px) { .scenario-overview .identity-grid { grid-template-columns:1fr; } .control-add-grid,.highlight-slots,.item-editor-dialog .field-grid { grid-template-columns:1fr; } }
    @container (max-width:420px) { .row-actions { gap:0; } .icon-button { width:30px; height:36px; } .navigation-row { grid-template-columns:minmax(0,1fr) minmax(0,auto) auto; gap:6px; } .navigation-summary { min-width:0; overflow:hidden; text-overflow:ellipsis; } }
    @media (max-width:600px) { .item-editor-dialog { --dialog-header-padding:12px 16px; --dialog-body-padding:14px 16px 18px; } }
  `];

  private emit(patch:Partial<EnergyAutomationSectionConfig>) {
    const config = { ...this.config,...patch,type:"custom:energy-automation-section" as const };
    this.config = config;
    this.dispatchEvent(new CustomEvent("config-changed",{ detail:{config},bubbles:true,composed:true }));
  }
  private updateScenarios(scenarios:AutomationScenarioConfig[]) { this.emit({scenarios}); }
  private scenario(id:string) { return this.config.scenarios.find((item) => item.id === id); }
  private updateScenario(id:string,update:(item:AutomationScenarioConfig)=>AutomationScenarioConfig) { this.updateScenarios(this.config.scenarios.map((item) => item.id===id ? update(item) : item)); }
  private updateScenarioAction(scenarioId:string,id:string,patch:Partial<ScenarioActionConfig>){this.updateScenario(scenarioId,s=>({...s,actions:(s.actions??[]).map(item=>item.id===id?{...item,...patch}:item)}));}
  private group(scenario:AutomationScenarioConfig,id:string) { return (scenario.automation_groups ?? []).find((item) => item.id===id); }
  private updateGroup(scenarioId:string,groupId:string,update:(group:AutomationGroupConfig)=>AutomationGroupConfig) { this.updateScenario(scenarioId,(scenario) => ({...scenario,automation_groups:(scenario.automation_groups ?? []).map((group) => group.id===groupId ? update(group) : group)})); }
  private updateAutomation(scenarioId:string,groupId:string,automationId:string,update:(item:LinkedAutomationConfig)=>LinkedAutomationConfig) { this.updateGroup(scenarioId,groupId,(group) => ({...group,automations:group.automations.map((item) => item.id===automationId ? update(item) : item)})); }
  private ask(label:string,run:()=>void,title?:string,confirmLabel?:string) { this.confirmTarget={label,run,title,confirmLabel}; }

  private renderRow(label:string,secondary:string,onEdit:()=>void,index:number,total:number,onMove:(direction:-1|1)=>void,onRemove:(()=>void)|undefined,icon?:string) {
    return html`<div class="item-row"><ic-select-item .displayLabel=${label} .secondaryLabel=${secondary} .hideIndicator=${true} @click=${onEdit}>${icon ? html`<ha-icon .icon=${icon}></ha-icon> ` : nothing}${label}<span slot="secondary">${secondary}</span><ha-icon slot="trailing" icon="mdi:chevron-right"></ha-icon></ic-select-item><div class="row-actions"><button class="icon-button" title="Move up" ?disabled=${index===0} @click=${() => onMove(-1)}><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="icon-button" title="Move down" ?disabled=${index===total-1} @click=${() => onMove(1)}><ha-icon icon="mdi:chevron-down"></ha-icon></button>${onRemove?html`<button class="icon-button destructive" title="Remove" @click=${onRemove}><ha-icon icon="mdi:delete-outline"></ha-icon></button>`:nothing}</div></div>`;
  }
  private field(label:string,value:string,onValue:(value:string)=>void,placeholder="") { return html`<ic-field variant="compact" .label=${label} .value=${value} .placeholder=${placeholder} @field-change=${(event:CustomEvent<FieldValueDetail>)=>onValue(event.detail.value)}></ic-field>`; }
  private select(label:string,value:string,options:readonly {value:string;label:string}[],onValue:(value:string)=>void) { return html`<label class="control-label"><span>${label}</span><ic-select-field .value=${value} .options=${options} @select-change=${(event:CustomEvent<SelectFieldChangeDetail>)=>onValue(event.detail.value)}></ic-select-field></label>`; }
  private binding(label:string,value:string,target:PickerTarget) { return html`<div class="binding"><span class="binding-label">${label}</span><div class="binding-control"><button class="binding-value" type="button" @click=${()=>{this.picker=target;}}>${value || "Not configured"}</button>${value ? html`<button class="icon-button" title="Clear" @click=${()=>this.applyEntity(target,"")}><ha-icon icon="mdi:close"></ha-icon></button>`:nothing}</div></div>`; }
  private friendlyBinding(label:string,value:string|undefined,target:PickerTarget,optional=false){return html`<div class="binding"><span class="binding-label">${label}${optional?html` <span class="secondary-copy">Optional</span>`:nothing}</span><div class="binding-control"><button class="binding-value friendly" type="button" @click=${()=>{this.picker=target;}}><span class="binding-friendly-name">${value?this.entityLabel(value):`Add ${label.toLowerCase()}`}</span>${value?html`<span class="binding-entity-id">${value}</span>`:nothing}</button>${value?html`<button class="icon-button" title="Clear" @click=${()=>this.applyEntity(target,"")}><ha-icon icon="mdi:close"></ha-icon></button>`:nothing}</div></div>`;}

  private renderSection() {
    const scenarios=this.config.scenarios;
    return html`<div class="editor"><section class="editor-section"><div class="section-heading"><div class="section-title">Automation</div></div>${this.field("Title",this.config.title ?? "Automation",(title)=>this.emit({title}))}</section><section class="editor-section"><div class="section-bar"><div class="section-heading"><div class="section-title">Scenarios</div></div><ic-button variant="secondary" @click=${()=>{this.creationOpen=true;}}>Add Scenario</ic-button></div><div class="list">${scenarios.length ? scenarios.map((scenario,index)=>this.renderRow(scenario.identity?.title ?? scenario.title ?? scenario.id ?? "Scenario",`${scenario.identity?.subtitle ?? scenario.subtitle ?? ""}${scenario.automation_groups?.length ? ` · ${scenario.automation_groups.length} Groups · ${scenario.automation_groups.reduce((sum,group)=>sum+group.automations.length,0)} Automations`:""}`,()=>{this.view={kind:"scenario",scenarioId:scenario.id!};},index,scenarios.length,(direction)=>this.updateScenarios(moveEditorItem(scenarios,index,direction)),undefined,scenario.identity?.icon ?? scenario.icon)) : html`<div class="empty"><strong>No automation scenarios yet.</strong><br/>Create your first smart automation scenario.</div>`}</div></section></div>`;
  }

  private renderScenario(view:Extract<View,{kind:"scenario"}>) {
    const scenario=this.scenario(view.scenarioId); if(!scenario){this.view={kind:"section"};return nothing;}
    const identity=scenario.identity ?? {};
    const metrics=scenario.metrics ?? [],settings=scenario.settings ?? [],groups=scenario.automation_groups ?? [];
    const patch=(value:Partial<AutomationScenarioConfig>)=>this.updateScenario(view.scenarioId,(item)=>({...item,...value}));
    const patchIdentity=(value:Record<string,string>)=>patch({identity:{...identity,...value}});
    const automationCount=groups.reduce((sum,group)=>sum+group.automations.length,0);
    return html`<div class="editor scenario-overview"><ic-subpage-header title=${identity.title || "Scenario"} @subpage-back=${()=>{this.view={kind:"section"};}}></ic-subpage-header>
      <section class="editor-section"><div class="section-title">Identity</div><div class="identity-grid"><ic-icon-input .value=${identity.icon ?? ""} @icon-change=${(event:CustomEvent<IconChangeDetail>)=>patchIdentity({icon:event.detail.icon})}></ic-icon-input>${this.field("Title",identity.title ?? "",(title)=>patchIdentity({title}))}${this.field("Subtitle",identity.subtitle ?? "",(subtitle)=>patchIdentity({subtitle}))}</div></section>
      <section class="editor-section"><div class="navigation-list">
        ${this.accordionSection("card-display","Card Display",`${this.dashboardHighlights(scenario).length} Highlights`,this.renderCardDisplay(view.scenarioId,scenario,metrics))}
        ${this.accordionSection("controls","Controls",formatEditorCount(settings.filter(item=>this.controlRole(scenario,item)!=="observed").length,"Control"),this.renderControlBindings(view.scenarioId,scenario))}
        ${this.accordionSection("groups","Automations",`${formatEditorCount(groups.length,"Group")} · ${formatEditorCount(automationCount,"Automation")}`,this.renderGroupsInline(view.scenarioId,groups))}
      </div></section><section class="editor-section"><div class="section-title">Danger Zone</div><p class="section-description">Delete only this dashboard scenario. Home Assistant automations and entities are not deleted.</p><div><ic-button variant="destructive" @click=${()=>this.ask(`This removes “${identity.title||"Scenario"}” from this dashboard. Your Home Assistant automations and entities will not be deleted.`,()=>{this.view={kind:"section"};this.updateScenarios(this.config.scenarios.filter(item=>item!==scenario));},`Delete “${identity.title||"Scenario"}”?`,"Delete Scenario")}>Delete Scenario</ic-button></div></section>
    </div>`;
  }


  private accordionSection(id:string,label:string,summary:string,content:unknown){const expanded=this.expandedSections.has(id);return html`<div class="accordion-section"><button class="navigation-row" type="button" aria-expanded=${expanded} @click=${()=>{const next=new Set(this.expandedSections);expanded?next.delete(id):next.add(id);this.expandedSections=next;}}><span class="navigation-label">${label}</span><span class="navigation-summary">${summary}</span><ha-icon icon=${expanded?"mdi:chevron-down":"mdi:chevron-right"}></ha-icon></button>${expanded?html`<div class="accordion-body">${content}</div>`:nothing}</div>`;}

  private resolvedScenario(scenario:AutomationScenarioConfig){try{return resolveAutomationScenarioRuntime(this.hass,normalizeAutomationScenarioConfig(scenario).config);}catch{return undefined;}}
  private dashboardHighlights(scenario:AutomationScenarioConfig){const resolved=this.resolvedScenario(scenario);return resolved?resolveAutomationHighlights(resolved):[];}
  private highlightRefs(scenario:AutomationScenarioConfig){if(scenario.dashboard?.highlights)return scenario.dashboard.highlights;return this.dashboardHighlights(scenario).map(item=>item.id);}
  private renderCardDisplay(scenarioId:string,scenario:AutomationScenarioConfig,metrics:ScenarioMetricConfig[]){const explicit=Boolean(scenario.dashboard?.highlights);return html`<div class="list"><div class="binding-group editor-subsection"><div class="highlight-heading"><div class="binding-group-title">Top Highlights</div><div class="highlight-mode">${explicit?html`<span>Custom ·</span><button class="highlight-reset" type="button" @click=${()=>this.updateScenario(scenarioId,s=>{const {dashboard:_,...rest}=s;return rest;})}>Reset</button>`:html`<span>Automatic</span>`}</div></div>${this.renderDashboardDisplay(scenarioId,scenario,metrics)}</div><div class="card-display-regions">${this.renderCardDisplayRegions(scenarioId,scenario)}</div></div>`;}
  private renderDashboardDisplay(scenarioId:string,scenario:AutomationScenarioConfig,metrics:ScenarioMetricConfig[]){const items=this.dashboardHighlights(scenario),candidates=this.highlightCandidates(scenarioId),positions=["Left","Center","Right"];return html`<div class="highlight-slots">${[0,1,2].map(index=>{const item=items[index],selectedElsewhere=new Set(items.filter((_,itemIndex)=>itemIndex!==index).map(candidate=>candidate.id)),slotCandidates=candidates.filter(candidate=>candidate.id===item?.id||!selectedElsewhere.has(candidate.id)),slotOptions=[...slotCandidates.map(candidate=>({value:candidate.id,label:`${candidate.label} · ${displayHighlightSource(candidate.source)}`})),{value:"__add_custom_data__",label:"Add custom data..."}],metric=item?.id.startsWith("metric:")?metrics.find(candidate=>canonicalAutomationEntityId(candidate.entity)===item.id.slice("metric:".length)):undefined;if(item&&!slotOptions.some(option=>option.value===item.id))slotOptions.unshift({value:item.id,label:`${item.label} · ${displayHighlightSource(item.source)}`});return html`<label class="control-label highlight-select"><span>${positions[index]}</span><ic-select-field .value=${item?.id??""} .selectedLabel=${item?.label??"Not configured"} .options=${slotOptions} .actionIcon=${metric?"mdi:pencil-outline":""} .actionLabel=${metric?`Edit ${item?.label??"card data"}`:""} @select-action=${()=>{if(metric)this.view={kind:"metric",scenarioId,itemId:metric.entity};}} @select-change=${(event:CustomEvent<SelectFieldChangeDetail>)=>this.selectHighlight(scenarioId,index,event.detail.value)}></ic-select-field></label>`;})}</div>`;}
  private highlightCandidates(scenarioId:string){const scenario=this.scenario(scenarioId),resolved=scenario&&this.resolvedScenario(scenario);return resolved?collectAutomationHighlightCandidates(resolved):[];}
  private selectHighlight(scenarioId:string,index:number,id:string){if(id==="__add_custom_data__"){this.pendingMetricHighlight={scenarioId,index};this.picker={kind:"add-metric",scenarioId};return;}this.setHighlight(scenarioId,index,id);}
  private setHighlight(scenarioId:string,index:number,id:string){const candidates=this.highlightCandidates(scenarioId);this.updateScenario(scenarioId,scenario=>{const next=[...this.highlightRefs(scenario)];while(next.length<index){const filler=candidates.find(candidate=>candidate.id!==id&&!next.includes(candidate.id));if(!filler)break;next.push(filler.id);}if(next.length===index)next.push(id);else next[index]=id;return {...scenario,dashboard:{highlights:[...new Set(next)].slice(0,3)}};});}

  private activityRow(name:string,summary:string,onOpen:()=>void){return html`<button class="activity-config-row" type="button" @click=${onOpen}><span class="activity-config-copy"><span class="activity-config-name">${name}</span><span class="activity-config-summary">${summary}</span></span><ha-icon icon="mdi:chevron-right"></ha-icon></button>`;}
  private entityLabel(entity:string|undefined){return entity?this.friendly(entity):"";}
  private explanationPreview(scenario:AutomationScenarioConfig){const resolved=this.resolvedScenario(scenario),binding=resolved?.explanation.bindings.reason;if(binding?.status==="valid")return resolved?.explanation.reason??"No explanation";if(binding?.status==="unavailable")return "Explanation unavailable";if(binding?.status==="unknown")return "Explanation unknown";if(binding?.status==="missing")return "Explanation entity not found";return "No explanation";}
  private progressPresentation(scenario:AutomationScenarioConfig){const progress=scenario.progress,readiness=getProgressEditorReadiness(progress),current=this.entityLabel(progress?.current_entity),target=this.entityLabel(progress?.target_entity);if(readiness==="configure")return {readiness,summary:"No progress visual",detail:""};if(!progress?.current_entity)return {readiness,summary:target||"Progress needs setup",detail:"Needs current value"};if(!progress.target_entity)return {readiness,summary:current,detail:"Needs target"};return {readiness,summary:`${current} → ${target}`,detail:""};}
  private thresholdPresentation(scenario:AutomationScenarioConfig){const context=scenario.explanation?.decision_context,readiness=getThresholdComparisonEditorReadiness(context),observed=this.entityLabel(context?.observed_entity),resolved=this.resolvedScenario(scenario),threshold=this.entityLabel(context?.threshold_entity)||(context?.threshold!==undefined?(resolved?.decisionContext?.thresholdValue??String(context.threshold)):"");if(readiness==="configure")return {readiness,summary:"No threshold comparison",detail:""};if(!context?.observed_entity)return {readiness,summary:threshold||"Threshold comparison needs setup",detail:"Needs observed value"};if(!context.threshold_entity&&context.threshold===undefined)return {readiness,summary:observed,detail:"Needs threshold"};return {readiness,summary:`${observed} vs ${threshold}`,detail:""};}
  private renderCardDisplayRegions(scenarioId:string,scenario:AutomationScenarioConfig){const statusName=this.entityLabel(scenario.status_entity)||"Add status source",progress=this.progressPresentation(scenario),threshold=this.thresholdPresentation(scenario),activityTypes=[progress.readiness!=="configure"?"Progress":"",threshold.readiness!=="configure"?"Threshold Comparison":""].filter(Boolean),activitySummary=activityTypes.join(" · ")||"No activity visuals",last=scenario.explanation?.last_action_entity??scenario.last_action_entity,nextAction=scenario.explanation?.next_action_entity??scenario.next_action_entity,next=scenario.next_decision,nextConfigured=Boolean(next&&(next.time_entity||next.label_entity||next.condition_entity||next.time||next.label||next.condition)),footerTypes=[last?"Last Action":"",nextConfigured||nextAction?"Next Decision":""].filter(Boolean);return html`<div class="binding-group">${this.activityRow("Scenario Status",statusName,()=>{this.view={kind:"scenario-status",scenarioId};})}</div><div class="binding-group">${this.activityRow("Automation Activity",activitySummary,()=>{this.view={kind:"automation-activity",scenarioId};})}</div><div class="binding-group">${this.activityRow("Activity Footer",footerTypes.join(" · ")||"No footer information",()=>{this.view={kind:"activity-footer",scenarioId};})}</div>`;}
  private renderAutomationActivityPage(scenarioId:string){const scenario=this.scenario(scenarioId);if(!scenario)return nothing;const context=scenario.explanation?.decision_context,advanced=html`<section class="editor-section"><div class="field-grid">${this.friendlyBinding("Explanation",context?.message_entity,this.activityTarget(scenarioId,"decision_message"),true)}</div></section>`;return html`<div class="editor"><section class="editor-section"><div class="section-title">Progress</div><div class="field-grid">${this.friendlyBinding("Current",scenario.progress?.current_entity,this.activityTarget(scenarioId,"progress_current"))}${this.friendlyBinding("Target",scenario.progress?.target_entity,this.activityTarget(scenarioId,"progress_target"))}${this.friendlyBinding("Estimated Ready",scenario.progress?.estimated_entity,this.activityTarget(scenarioId,"progress_estimated"),true)}</div></section><section class="editor-section"><div class="section-title">Threshold Comparison</div><div class="field-grid">${this.friendlyBinding("Compare",context?.observed_entity,this.activityTarget(scenarioId,"decision_observed"))}${context?.threshold_entity?this.friendlyBinding("Against",context.threshold_entity,this.activityTarget(scenarioId,"decision_threshold")):html`<div class="binding"><span class="binding-label">Against</span><div class="binding-control"><button class="binding-value friendly" type="button" @click=${()=>{this.picker=this.activityTarget(scenarioId,"decision_threshold");}}><span class="binding-friendly-name">${context?.threshold!==undefined?String(context.threshold):"Add threshold"}</span>${context?.threshold!==undefined?html`<span class="binding-entity-id">Fixed value</span>`:nothing}</button></div></div>`}</div></section><section class="editor-section"><div class="navigation-list">${this.accordionSection(`activity-advanced-${scenarioId}`,"Advanced","Explanation",advanced)}</div></section></div>`;}
  private activityTarget(scenarioId:string,field:Extract<PickerTarget,{kind:"presentation"}>["field"]):PickerTarget{return {kind:"presentation",scenarioId,field};}
  private statePreview(entityId:string|undefined){if(!entityId)return "Not configured";const state=this.hass?.states[entityId];if(!state)return "Entity not found";if(state.state==="unavailable")return "Unavailable";if(state.state==="unknown")return "Unknown";const formatter=(this.hass as (HomeAssistant&{formatEntityState?:(value:typeof state)=>string})|undefined)?.formatEntityState;try{return formatter?formatter.call(this.hass,state):state.state;}catch{return state.state;}}
  private renderScenarioStatusPage(scenarioId:string){const scenario=this.scenario(scenarioId),resolved=scenario&&this.resolvedScenario(scenario);if(!scenario)return nothing;const reason=scenario.explanation?.reason_entity??scenario.reason_entity;return html`<div class="editor"><section class="editor-section"><div class="section-title">Status</div><div class="field-grid">${this.friendlyBinding("Status",scenario.status_entity,{kind:"scenario",scenarioId,field:"status_entity"})}</div>${scenario.status_entity?html`<p class="secondary-copy">Currently · ${resolved?.lifecycle.label??"Unavailable"}</p>`:nothing}</section><section class="editor-section"><div class="section-title">Explanation</div><div class="field-grid">${this.friendlyBinding("Explanation",reason,{kind:"scenario",scenarioId,field:"reason_entity"},true)}</div>${reason?html`<p class="secondary-copy">Preview · ${this.explanationPreview(scenario)}</p>`:nothing}</section></div>`;}
  private renderActivityFooterPage(scenarioId:string){const scenario=this.scenario(scenarioId);if(!scenario)return nothing;const last=scenario.explanation?.last_action_entity??scenario.last_action_entity,nextAction=scenario.explanation?.next_action_entity??scenario.next_action_entity,next=scenario.next_decision,advanced=html`<section class="editor-section"><div class="field-grid">${this.friendlyBinding("Condition",next?.condition_entity,this.activityTarget(scenarioId,"next_condition"),true)}${nextAction?this.friendlyBinding("Legacy Next Action",nextAction,{kind:"scenario",scenarioId,field:"next_action_entity"}):nothing}</div>${nextAction?html`<p class="secondary-copy">Legacy Next Action is used when no Next Decision is available.</p>`:nothing}</section>`;return html`<div class="editor"><section class="editor-section"><div class="section-title">Last Action</div><div class="field-grid">${this.friendlyBinding("Last Action",last,{kind:"scenario",scenarioId,field:"last_action_entity"})}</div>${last?html`<p class="secondary-copy">Preview · ${this.statePreview(last)}</p>`:nothing}</section><section class="editor-section"><div class="section-title">Next Decision</div><div class="field-grid">${this.friendlyBinding("Event",next?.label_entity,this.activityTarget(scenarioId,"next_label"))}${this.friendlyBinding("Time",next?.time_entity,this.activityTarget(scenarioId,"next_time"))}</div></section><section class="editor-section"><div class="navigation-list">${this.accordionSection(`footer-advanced-${scenarioId}`,"Advanced",nextAction?"Condition · Legacy":"Condition",advanced)}</div></section></div>`;}

  private renderGroupsInline(scenarioId:string,groups:AutomationGroupConfig[]){
    return html`<section class="editor-section editor-subsection"><div class="binding-group-title">Groups</div><div class="list">${groups.length?groups.map((group,index)=>this.renderRow(
      group.label,formatEditorCount(group.automations.length,"Automation"),
      ()=>{this.view={kind:"group",scenarioId,groupId:group.id};},
      index,groups.length,
      direction=>this.updateScenario(scenarioId,item=>({...item,automation_groups:moveEditorItem(groups,index,direction)})),
      undefined
    )):html`<div class="empty">No automation groups configured yet.</div>`}</div><div class="section-bar"><ic-button variant="secondary" @click=${()=>{const id=createStableEditorId("group",groups.map(group=>group.id));this.updateScenario(scenarioId,item=>({...item,automation_groups:[...groups,{id,label:"New Group",automations:[]}]}));}}>Add Group</ic-button></div></section>`;
  }
  private updateMetric(scenarioId:string,entity:string,patch:Partial<ScenarioMetricConfig>){this.updateScenario(scenarioId,s=>({...s,metrics:(s.metrics??[]).map(item=>item.entity===entity?{...item,...patch}:item)}));}
  private isManualOverrideControl(scenario:AutomationScenarioConfig,item:ScenarioSettingConfig){return item.role==="manual_override"||item.id.trim().toLowerCase().replace(/_/g,"-")==="manual-override"||Boolean(scenario.manual_override_entity&&item.entity.trim().toLowerCase()===scenario.manual_override_entity.trim().toLowerCase());}
  private controlRole(scenario:AutomationScenarioConfig,item:ScenarioSettingConfig){if(this.isManualOverrideControl(scenario,item))return "manual_override";if(this.isStrategyControl(scenario,item))return "scenario";return item.role??item.scope??"observed";}
  private isStrategyControl(scenario:AutomationScenarioConfig,item:ScenarioSettingConfig){const entity=scenario.strategy?.entity??scenario.strategy_entity??"";return Boolean(entity&&item.entity.trim().toLowerCase()===entity.trim().toLowerCase());}
  private controlRoleLabel(role:string){return role==="scenario"?"Scenario setting":role==="device"?"Device":role==="manual_override"?"Override":"Observed";}
  private removeControl(scenarioId:string,item:ScenarioSettingConfig){this.updateScenario(scenarioId,current=>{const strategy=this.isStrategyControl(current,item),manual=this.isManualOverrideControl(current,item);return {...current,settings:(current.settings??[]).filter(candidate=>candidate!==item),strategy:strategy?undefined:current.strategy,strategy_entity:strategy?undefined:current.strategy_entity,manual_override_entity:manual&&current.manual_override_entity?.trim().toLowerCase()===item.entity.trim().toLowerCase()?undefined:current.manual_override_entity};});this.view={kind:"scenario",scenarioId};}
  private moveVisibleControl(scenarioId:string,items:ScenarioSettingConfig[],index:number,direction:-1|1){const target=index+direction;if(target<0||target>=items.length)return;this.updateScenario(scenarioId,scenario=>{const all=scenario.settings??[],left=all.indexOf(items[index]!),right=all.indexOf(items[target]!);if(left<0||right<0)return scenario;const next=[...all];[next[left],next[right]]=[next[right]!,next[left]!];return {...scenario,settings:next};});}
  private renderControlBindings(scenarioId:string,scenario:AutomationScenarioConfig) {
    const items=(scenario.settings??[]).filter(item=>this.controlRole(scenario,item)!=="observed"),reordering=this.reorderControlsScenarioId===scenarioId;
    return html`<div class="controls-toolbar"><button class="text-action" type="button" @click=${()=>{this.reorderControlsScenarioId=reordering?"":scenarioId;}}>${reordering?"Done":"Reorder"}</button></div><div class="list">${items.length?items.map((item,index)=>html`<div class="item-row"><ic-select-item .displayLabel=${item.label??this.friendly(item.entity)} .secondaryLabel=${this.controlRoleLabel(this.controlRole(scenario,item))} .hideIndicator=${true} @click=${reordering?undefined:()=>{this.view={kind:"control",scenarioId,itemId:item.id};}}>${item.icon?html`<ha-icon .icon=${item.icon}></ha-icon> `:nothing}${item.label??this.friendly(item.entity)}<span slot="secondary">${this.controlRoleLabel(this.controlRole(scenario,item))}</span>${reordering?nothing:html`<ha-icon slot="trailing" icon="mdi:chevron-right"></ha-icon>`}</ic-select-item>${reordering?html`<div class="row-actions"><button class="icon-button" title="Move up" ?disabled=${index===0} @click=${()=>this.moveVisibleControl(scenarioId,items,index,-1)}><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="icon-button" title="Move down" ?disabled=${index===items.length-1} @click=${()=>this.moveVisibleControl(scenarioId,items,index,1)}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`:nothing}</div>`):html`<div class="empty">No controls configured.</div>`}</div><div class="control-add"><button class="text-action" type="button" @click=${()=>{this.addControlDraft={entity:"",label:"",role:"scenario"};this.view={kind:"add-control",scenarioId};}}>+ Add Control</button></div>`;
  }
  private updateSetting(scenarioId:string,id:string,patch:Partial<ScenarioSettingConfig>){this.updateScenario(scenarioId,s=>({...s,settings:(s.settings??[]).map(item=>item.id===id?{...item,...patch}:item)}));}
  private suggestedControlRole(scenario:AutomationScenarioConfig,entity:string):EditableControlRole {const id=canonicalAutomationEntityId(entity);if(id===canonicalAutomationEntityId(scenario.strategy?.entity??scenario.strategy_entity))return "scenario";if(id===canonicalAutomationEntityId(scenario.manual_override_entity))return "manual_override";if((scenario.automation_groups??[]).some(group=>group.automations.some(automation=>canonicalAutomationEntityId(automation.device?.entity)===id)))return "device";const domain=id.split(".",1)[0];return ["climate","fan","light","cover","water_heater"].includes(domain)?"device":"scenario";}
  private duplicateControl(scenario:AutomationScenarioConfig,entity:string){const id=canonicalAutomationEntityId(entity);return (scenario.settings??[]).find(item=>canonicalAutomationEntityId(item.entity)===id);}
  private addDraftControl(scenarioId:string){const scenario=this.scenario(scenarioId),draft=this.addControlDraft;if(!scenario||!draft?.entity||this.duplicateControl(scenario,draft.entity))return;const items=scenario.settings??[],setting:ScenarioSettingConfig={id:createStableEditorId(draft.role==="manual_override"?"manual-override":draft.entity,items.map(item=>item.id)),entity:draft.entity,label:draft.label.trim()||this.friendly(draft.entity),control:"auto",role:draft.role};this.updateScenario(scenarioId,current=>({...current,settings:[...(current.settings??[]),setting],manual_override_entity:draft.role==="manual_override"?draft.entity:current.manual_override_entity}));this.addControlDraft=undefined;this.view={kind:"control",scenarioId,itemId:setting.id};}
  private renderAddControlPage(scenarioId:string){const scenario=this.scenario(scenarioId),draft=this.addControlDraft;if(!scenario||!draft)return nothing;const duplicate=draft.entity?this.duplicateControl(scenario,draft.entity):undefined;return html`<div class="editor"><ic-subpage-header title="Add Control" @subpage-back=${()=>{this.addControlDraft=undefined;this.view={kind:"scenario",scenarioId};}}></ic-subpage-header><section class="editor-section"><div class="section-title">Control</div><div class="field-grid">${this.friendlyBinding("Entity",draft.entity,{kind:"add-control-entity",scenarioId})}${this.field("Label",draft.label,label=>{this.addControlDraft={...draft,label};})}${this.select("Use as",draft.role,CONTROL_ROLE_OPTIONS,role=>{this.addControlDraft={...draft,role:role as EditableControlRole};})}</div>${duplicate?html`<div class="duplicate-notice"><strong>This entity is already used by “${duplicate.label??this.friendly(duplicate.entity)}”.</strong><button class="text-action" type="button" @click=${()=>{this.addControlDraft=undefined;this.view={kind:"control",scenarioId,itemId:duplicate.id};}}>Edit existing control</button></div>`:nothing}</section><section class="editor-section"><ic-button .disabled=${!draft.entity||Boolean(duplicate)} @click=${()=>this.addDraftControl(scenarioId)}>Add</ic-button></section></div>`;}
  private updateControlRole(scenarioId:string,item:ScenarioSettingConfig,role:EditableControlRole){this.updateScenario(scenarioId,scenario=>{if(this.isStrategyControl(scenario,item))return scenario;const wasManual=this.isManualOverrideControl(scenario,item),matchesManual=canonicalAutomationEntityId(scenario.manual_override_entity)===canonicalAutomationEntityId(item.entity);return {...scenario,settings:(scenario.settings??[]).map(candidate=>candidate.id===item.id?{...candidate,role}:candidate),manual_override_entity:role==="manual_override"?item.entity:wasManual&&matchesManual?undefined:scenario.manual_override_entity};});}
  private controlOptions(entity:string){const domain=canonicalAutomationEntityId(entity).split(".",1)[0],allowed=domain==="input_datetime"?["auto","time","datetime"]:["switch","input_boolean","fan","light"].includes(domain)?["auto","toggle"]:["select","input_select"].includes(domain)?["auto","select"]:["number","input_number"].includes(domain)?["auto","number"]:["auto","toggle","select","number","time","datetime"];return CONTROL_OPTIONS.filter(option=>allowed.includes(option.value));}

  private renderMetricPage(view:Extract<View,{kind:"metric"}>){const item=this.scenario(view.scenarioId)?.metrics?.find(metric=>metric.entity===view.itemId);if(!item){this.view={kind:"scenario",scenarioId:view.scenarioId};return nothing;}const useThemeColor=!item.icon_color;return html`<div class="editor"><ic-subpage-header title=${item.label??"Card Data"} @subpage-back=${()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};}}></ic-subpage-header><section class="editor-section"><div class="section-title">Display</div><div class="field-grid">${this.field("Label",item.label??"",label=>this.updateMetric(view.scenarioId,item.entity,{label}))}<ic-icon-input .value=${item.icon??""} @icon-change=${(e:CustomEvent<IconChangeDetail>)=>this.updateMetric(view.scenarioId,item.entity,{icon:e.detail.icon})}></ic-icon-input><div class="color-control"><span class="color-label">Icon Color</span><div class="color-row" style=${item.icon_color?`--metric-editor-color:${item.icon_color}`:""}><span class="color-swatch"></span><span class="color-mode">${useThemeColor?"Theme color":item.icon_color}</span>${useThemeColor?nothing:html`<input class="color-input" type="color" aria-label="Custom metric icon color" .value=${item.icon_color??"#444D9E"} @input=${(event:Event)=>this.updateMetric(view.scenarioId,item.entity,{icon_color:(event.target as HTMLInputElement).value})}/>`}<ha-switch .checked=${useThemeColor} aria-label="Use theme color" @change=${(event:Event)=>this.updateMetric(view.scenarioId,item.entity,{icon_color:(event.target as HTMLInputElement).checked?undefined:"#444D9E"})}></ha-switch></div></div></div></section><section class="editor-section"><div class="section-title">Data</div><div class="field-grid">${this.binding("Entity",item.entity,{kind:"metric",scenarioId:view.scenarioId,itemId:item.entity})}${this.select("Format",item.format??"auto",FORMAT_OPTIONS,format=>this.updateMetric(view.scenarioId,item.entity,{format:format as ScenarioMetricConfig["format"]}))}</div></section><section class="editor-section dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`Delete ${item.label??item.entity}?`,()=>this.deleteMetric(view.scenarioId,item.entity),"Delete Card Data?","Delete Card Data")}>Delete Card Data</ic-button></section></div>`;}
  private deleteMetric(scenarioId:string,entity:string){const ref=`metric:${canonicalAutomationEntityId(entity)}`;this.updateScenario(scenarioId,scenario=>{const metrics=(scenario.metrics??[]).filter(item=>canonicalAutomationEntityId(item.entity)!==canonicalAutomationEntityId(entity));if(!scenario.dashboard)return {...scenario,metrics};const highlights=scenario.dashboard.highlights?.filter(item=>item!==ref)??[];return {...scenario,metrics,dashboard:highlights.length?{...scenario.dashboard,highlights}:undefined};});this.view={kind:"scenario",scenarioId};}
  private renderControlPage(view:Extract<View,{kind:"control"}>){
    return this.renderUserControlPage(view);
  }
  private renderUserControlPage(view:Extract<View,{kind:"control"}>){
    const scenario=this.scenario(view.scenarioId),item=scenario?.settings?.find(setting=>setting.id===view.itemId);
    if(!scenario||!item){this.view={kind:"scenario",scenarioId:view.scenarioId};return nothing;}
    const nextRun=item.change_mode==="next_run",strategy=this.isStrategyControl(scenario,item),controlType=item.control??"auto";
    const overrideIssues=nextRun ? [
      !item.override?.value_entity ? "Override Value Entity is required." : "",
      !item.override?.active_entity ? "Override Active Entity is required." : "",
      item.override?.value_entity && item.override.value_entity.split(".",1)[0]!==item.entity.split(".",1)[0] ? `Override Value Entity must use the ${item.entity.split(".",1)[0]} domain.` : "",
      item.override?.active_entity && !item.override.active_entity.startsWith("input_boolean.") ? "Override Active Entity must use the input_boolean domain." : "",
    ].filter(Boolean) : [];
    const advanced=html`<section class="editor-section"><div class="field-grid">${this.select("Change Behavior",item.change_mode??"direct",[{value:"direct",label:"Direct"},{value:"next_run",label:"Next Run Override"}],change_mode=>this.updateSetting(view.scenarioId,item.id,{change_mode:change_mode as ScenarioSettingConfig["change_mode"]}))}</div>${nextRun?html`<div class="binding-group"><div class="binding-group-title">Next Run Override</div><p class="section-description">The linked HA automation must consume and clear one-time overrides.</p><div class="field-grid">${this.binding("Override Value Entity",item.override?.value_entity??"",{kind:"setting-override",scenarioId:view.scenarioId,itemId:item.id,field:"value_entity"})}${this.binding("Override Active Entity",item.override?.active_entity??"",{kind:"setting-override",scenarioId:view.scenarioId,itemId:item.id,field:"active_entity"})}</div>${overrideIssues.length?html`<div class="secondary-copy danger">${overrideIssues.map(issue=>html`<div>${issue}</div>`)}</div>`:nothing}</div>`:nothing}</section>`;
    const role=this.controlRole(scenario,item) as EditableControlRole;
    const useAs=strategy?html`<label class="control-label"><span>Use as</span><ic-select-field .value=${"scenario"} .options=${CONTROL_ROLE_OPTIONS} .disabled=${true}></ic-select-field></label>`:this.select("Use as",role,CONTROL_ROLE_OPTIONS,selected=>this.updateControlRole(view.scenarioId,item,selected as EditableControlRole));
    return html`<div class="editor"><ic-subpage-header title=${item.label??"Control"} @subpage-back=${()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};}}></ic-subpage-header><section class="editor-section"><div class="section-title">Control</div><div class="field-grid">${this.friendlyBinding("Entity",item.entity,{kind:"setting",scenarioId:view.scenarioId,itemId:item.id})}${this.field("Label",item.label??"",label=>this.updateSetting(view.scenarioId,item.id,{label}))}${useAs}${this.select("Display as",controlType,this.controlOptions(item.entity),control=>this.updateSetting(view.scenarioId,item.id,{control:control as ScenarioSettingConfig["control"]}))}${strategy?this.select("Presentation",scenario.strategy?.presentation??"select",[{value:"select",label:"Select"},{value:"segmented",label:"Segmented (up to 4 options)"}],presentation=>this.updateScenario(view.scenarioId,current=>({...current,strategy:{...(current.strategy??{}),entity:current.strategy?.entity??current.strategy_entity??item.entity,presentation:presentation as "select"|"segmented"},strategy_entity:undefined}))) : nothing}</div>${strategy?html`<p class="placement-note">Strategy controls remain Scenario settings.</p>`:role==="manual_override"?html`<p class="placement-note">Shown separately at the bottom of the control panel.</p>`:nothing}${controlType==="auto"?html`<p class="section-description">Automatic → ${inferredControlType(item.entity)}</p>`:nothing}</section><section class="editor-section"><div class="navigation-list">${this.accordionSection(`control-advanced-${item.id}`,"Advanced Behavior","Change behavior",advanced)}</div></section><section class="editor-section dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`Delete ${item.label??item.entity}?`,()=>this.removeControl(view.scenarioId,item),"Delete Control?","Delete Control")}>Delete Control</ic-button></section></div>`;
  }

  private renderGroup(view:Extract<View,{kind:"group"}>) {
    const scenario=this.scenario(view.scenarioId),group=scenario&&this.group(scenario,view.groupId); if(!scenario||!group){this.view={kind:"scenario",scenarioId:view.scenarioId};return nothing;}
    return html`<div class="editor">
      <ic-subpage-header title=${group.label} @subpage-back=${()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};}}></ic-subpage-header>
      <section class="editor-section"><div class="section-title">Group</div><div class="field-grid">
        ${this.field("Group Name",group.label,label=>this.updateGroup(view.scenarioId,view.groupId,item=>({...item,label})))}
      </div></section>
      <section class="editor-section"><div class="section-bar"><div class="section-title">Linked Automations</div><div>
        <ic-button variant="secondary" @click=${()=>{this.picker={kind:"add-automation",scenarioId:view.scenarioId,groupId:view.groupId};}}>Link Existing</ic-button>
      </div></div><div class="list">${group.automations.length ? group.automations.map((item,index)=>this.renderRow(
        item.name??item.entity,item.entity,
        ()=>{this.view={kind:"automation",scenarioId:view.scenarioId,groupId:view.groupId,automationId:item.id};},
        index,group.automations.length,
        direction=>this.updateGroup(view.scenarioId,view.groupId,current=>({...current,automations:moveEditorItem(current.automations,index,direction)})),
        undefined
      )) : html`<div class="empty">No automations linked yet.</div>`}</div></section>
      <section class="editor-section dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`Delete ${group.label}?`,()=>{this.updateScenario(view.scenarioId,item=>({...item,automation_groups:(item.automation_groups??[]).filter(candidate=>candidate.id!==view.groupId)}));this.view={kind:"scenario",scenarioId:view.scenarioId};},"Delete Group?","Delete Group")}>Delete Group</ic-button></section>
    </div>`;
  }

  private renderAutomation(view:Extract<View,{kind:"automation"}>) {
    const scenario=this.scenario(view.scenarioId),group=scenario&&this.group(scenario,view.groupId),automation=group?.automations.find(item=>item.id===view.automationId); if(!automation){this.view={kind:"group",scenarioId:view.scenarioId,groupId:view.groupId};return nothing;}
    const update=(patch:Partial<LinkedAutomationConfig>)=>this.updateAutomation(view.scenarioId,view.groupId,view.automationId,item=>({...item,...patch}));
    const params=automation.parameters??[],actions=automation.quick_actions??[];
    const bindingTarget=(field:"enabled"|"device"|"current"|"next"|"last"):PickerTarget=>({kind:"binding",scenarioId:view.scenarioId,groupId:view.groupId,automationId:view.automationId,field});
    const advanced=html`<section class="editor-section"><p class="section-description">Only needed when the Automation entity cannot provide its enabled state.</p><div class="field-grid">${this.binding("Enabled State",automation.enabled_entity??"",bindingTarget("enabled"))}</div></section>`;
    return html`<div class="editor"><ic-subpage-header title=${automation.name??automation.entity} @subpage-back=${()=>{this.view={kind:"group",scenarioId:view.scenarioId,groupId:view.groupId};}}></ic-subpage-header><section class="editor-section"><div class="section-title">Display</div><div class="field-grid">${this.field("Display Name",automation.name??"",name=>update({name}))}</div></section><section class="editor-section"><div class="section-title">Data</div><div class="field-grid">${this.binding("Automation",automation.entity,{kind:"automation",scenarioId:view.scenarioId,groupId:view.groupId,automationId:view.automationId})}</div></section><section class="editor-section"><div class="section-title">Activity</div><div class="field-grid">${this.binding("Current",automation.current?.entity??"",bindingTarget("current"))}${this.binding("Next",automation.next?.entity??"",bindingTarget("next"))}${this.binding("Last",automation.last?.entity??"",bindingTarget("last"))}</div></section><section class="editor-section"><div class="section-title">Device</div><div class="field-grid">${this.binding("Associated Device",automation.device?.entity??"",bindingTarget("device"))}</div></section>${this.renderParameters(view,params)}${this.renderActions(view,actions)}<section class="editor-section"><div class="navigation-list">${this.accordionSection(`automation-advanced-${automation.id}`,"Advanced","Special configuration",advanced)}</div></section><section class="editor-section dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`This removes ${automation.name??automation.entity} from this dashboard scenario. The Home Assistant automation is not deleted.`,()=>{this.updateGroup(view.scenarioId,view.groupId,current=>({...current,automations:current.automations.filter(candidate=>candidate.id!==view.automationId)}));this.view={kind:"group",scenarioId:view.scenarioId,groupId:view.groupId};},"Remove from Scenario?","Remove from Scenario")}>Remove from Scenario</ic-button></section></div>`;
  }
  private renderParameters(view:Extract<View,{kind:"automation"}>,items:LinkedAutomationParameterConfig[]) { return html`<section class="editor-section"><div class="section-bar"><div class="section-heading"><div class="section-title">Additional Card Data</div></div><ic-button variant="secondary" @click=${()=>{this.picker={kind:"add-parameter",scenarioId:view.scenarioId,groupId:view.groupId,automationId:view.automationId};}}>Add Data</ic-button></div><div class="list">${items.length?items.map((item,index)=>html`${this.renderRow(item.label??item.entity,item.entity,()=>{this.expandedParameterId=this.expandedParameterId===item.id?"":item.id;},index,items.length,direction=>this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,parameters:moveEditorItem(items,index,direction)})),undefined,item.icon)}${this.expandedParameterId===item.id?html`<div class="nested-editor"><div class="field-grid">${this.field("Label",item.label??"",label=>this.updateParameter(view,item.id,{label}))}${this.binding("Entity",item.entity,{kind:"parameter",scenarioId:view.scenarioId,groupId:view.groupId,automationId:view.automationId,itemId:item.id})}${this.select("Format",item.format??"auto",FORMAT_OPTIONS,format=>this.updateParameter(view,item.id,{format:format as LinkedAutomationParameterConfig["format"]}))}</div><div class="dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`Remove ${item.label??item.entity}?`,()=>{this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,parameters:items.filter(candidate=>candidate!==item)}));this.expandedParameterId="";},"Remove Card Data?","Remove")}>Remove</ic-button></div></div>`:nothing}`):html`<div class="empty">No additional card data configured.</div>`}</div></section>`; }
  private updateParameter(view:Extract<View,{kind:"automation"}>,id:string,patch:Partial<LinkedAutomationParameterConfig>){this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,parameters:(a.parameters??[]).map(item=>item.id===id?{...item,...patch}:item)}));}
  private renderActions(view:Extract<View,{kind:"automation"}>,items:ScenarioActionConfig[]) { return html`<section class="editor-section"><div class="section-bar"><div class="section-title">Quick Actions</div><ic-button variant="secondary" @click=${()=>{const id=createStableEditorId("action",items.map(item=>item.id));this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,quick_actions:[...items,{id,label:"New Action",tone:"neutral"}]}));this.expandedActionId=id;}}>Add Quick Action</ic-button></div><div class="list">${items.length?items.map((item,index)=>html`${this.renderRow(item.label??item.id,"Quick Action",()=>{this.expandedActionId=this.expandedActionId===item.id?"":item.id;},index,items.length,direction=>this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,quick_actions:moveEditorItem(items,index,direction)})),undefined,item.icon)}${this.expandedActionId===item.id?html`<div class="nested-editor"><div class="field-grid">${this.field("Label",item.label??"",label=>this.updateAction(view,item.id,{label}))}<ic-icon-input .value=${item.icon??""} @icon-change=${(e:CustomEvent<IconChangeDetail>)=>this.updateAction(view,item.id,{icon:e.detail.icon})}></ic-icon-input></div><div class="navigation-list">${this.accordionSection(`action-advanced-${item.id}`,"Advanced","Service & behavior",html`<section class="editor-section"><div class="field-grid">${this.field("Service",item.service??"",service=>this.updateAction(view,item.id,{service}))}${this.binding("Target Entity",item.target_entity??"",{kind:"action-target",scenarioId:view.scenarioId,groupId:view.groupId,automationId:view.automationId,itemId:item.id})}<label class="control-label"><span>Confirmation</span><ha-switch .checked=${item.confirmation??false} @change=${(e:Event)=>this.updateAction(view,item.id,{confirmation:(e.target as HTMLInputElement).checked})}></ha-switch></label>${this.select("Tone",item.tone??"neutral",["primary","neutral","destructive"].map(value=>({value,label:value})),tone=>this.updateAction(view,item.id,{tone:tone as ScenarioActionConfig["tone"]}))}</div>${item.service&&!item.service.includes(".")?html`<p class="secondary-copy danger">Service must use domain.service format.</p>`:nothing}${item.service&&!item.target_entity?html`<p class="secondary-copy danger">An explicit target entity is required.</p>`:nothing}</section>`)}</div><div class="dialog-destructive"><ic-button variant="destructive" @click=${()=>this.ask(`Remove ${item.label??item.id}?`,()=>{this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,quick_actions:items.filter(candidate=>candidate!==item)}));this.expandedActionId="";},"Remove Quick Action?","Remove")}>Remove</ic-button></div></div>`:nothing}`):html`<div class="empty">No quick actions configured.</div>`}</div></section>`; }
  private updateAction(view:Extract<View,{kind:"automation"}>,id:string,patch:Partial<ScenarioActionConfig>){this.updateAutomation(view.scenarioId,view.groupId,view.automationId,a=>({...a,quick_actions:(a.quick_actions??[]).map(item=>item.id===id?{...item,...patch}:item)}));}

  private applyEntity(target:PickerTarget,entityId:string) {
    const previous=this.pickerValue(target);
    if(previous&&entityId&&target.kind!=="add-scenario"&&target.kind!=="scenario-action-target"&&target.kind!=="action-target"){
      this.updateScenario(target.scenarioId,scenario=>replaceScenarioEntityBinding(scenario,previous,entityId));
      if(target.kind==="metric"&&this.view.kind==="metric")this.view={...this.view,itemId:entityId};
      this.picker=undefined;return;
    }
    if(target.kind==="add-scenario"){const scenario=createScenarioFromPreset(target.preset,entityId,this.config.scenarios.map(item=>item.id??""));this.updateScenarios([...this.config.scenarios,scenario]);this.view={kind:"scenario",scenarioId:scenario.id!};}
    else if(target.kind==="scenario") this.updateScenario(target.scenarioId,s=>{
      if(target.field==="strategy_entity") return {...s,strategy:entityId?{...(s.strategy??{}),entity:entityId}:undefined,strategy_entity:undefined};
      if(target.field==="status_entity") return {...s,status_entity:entityId};
      if(target.field==="goal_entity") return {...s,goal:entityId?{...(s.goal??{}),entity:entityId,label:s.goal?.label??this.friendly(entityId)}:undefined};
      if(target.field==="secondary_goal_entity") return {...s,secondary_goal:entityId?{...(s.secondary_goal??{}),entity:entityId,label:s.secondary_goal?.label??this.friendly(entityId)}:undefined};
      if(target.field==="execution_entity") return {...s,execution:entityId?{...(s.execution??{}),entity:entityId,label:s.execution?.label??this.friendly(entityId)}:undefined,device_entity:undefined};
      if(target.field==="manual_override_entity") return {...s,manual_override_entity:entityId||undefined};
      return {
        ...s,
        [target.field]:undefined,
        explanation:{...(s.explanation??{}),[target.field]:entityId||undefined},
      };
    });
    else if(target.kind==="add-metric"){
      const existing=this.scenario(target.scenarioId)?.metrics?.find(item=>canonicalAutomationEntityId(item.entity)===canonicalAutomationEntityId(entityId));
      if(!existing)this.updateScenario(target.scenarioId,s=>({...s,metrics:[...(s.metrics??[]),{entity:entityId,label:this.friendly(entityId),format:"auto",role:"secondary"}]}));
      const metricEntity=existing?.entity??entityId,pending=this.pendingMetricHighlight;
      if(pending?.scenarioId===target.scenarioId)this.setHighlight(target.scenarioId,pending.index,`metric:${canonicalAutomationEntityId(metricEntity)}`);
      this.pendingMetricHighlight=undefined;
      this.view={kind:"metric",scenarioId:target.scenarioId,itemId:metricEntity};
    }
    else if(target.kind==="metric"){
      const previousRef=`metric:${target.itemId.trim().toLowerCase()}`,nextRef=`metric:${entityId.trim().toLowerCase()}`;
      this.updateScenario(target.scenarioId,s=>({...s,metrics:(s.metrics??[]).map(item=>item.entity===target.itemId?{...item,entity:entityId}:item),dashboard:s.dashboard?{highlights:s.dashboard.highlights?.map(id=>id===previousRef?nextRef:id)}:undefined}));
      if(this.view.kind==="metric")this.view={...this.view,itemId:entityId};
    }
    else if(target.kind==="add-control-entity") {const scenario=this.scenario(target.scenarioId),role=scenario?this.suggestedControlRole(scenario,entityId):"scenario";this.addControlDraft={entity:entityId,label:this.friendly(entityId),role};}
    else if(target.kind==="setting") this.updateScenario(target.scenarioId,s=>{const item=s.settings?.find(setting=>setting.id===target.itemId),strategy=Boolean(item&&this.isStrategyControl(s,item)),manual=Boolean(item&&this.isManualOverrideControl(s,item)),previous=item?.entity??"";return {...s,settings:(s.settings??[]).map(setting=>setting.id===target.itemId?{...setting,entity:entityId}:setting),strategy:strategy&&entityId?{...(s.strategy??{}),entity:entityId}:strategy?undefined:s.strategy,strategy_entity:strategy?undefined:s.strategy_entity,manual_override_entity:manual&&canonicalAutomationEntityId(s.manual_override_entity)===canonicalAutomationEntityId(previous)?entityId||undefined:s.manual_override_entity};});
    else if(target.kind==="setting-override") this.updateSetting(target.scenarioId,target.itemId,{override:{
      ...(this.scenario(target.scenarioId)?.settings?.find(setting=>setting.id===target.itemId)?.override??{value_entity:"",active_entity:""}),
      [target.field]:entityId,
    }});
    else if(target.kind==="add-automation") this.updateGroup(target.scenarioId,target.groupId,g=>({...g,automations:[...g.automations,createLinkedAutomation(entityId,this.friendly(entityId),g.automations.map(item=>item.id))]}));
    else if(target.kind==="automation") this.updateAutomation(target.scenarioId,target.groupId,target.automationId,a=>({...a,entity:entityId}));
    else if(target.kind==="add-parameter") this.updateAutomation(target.scenarioId,target.groupId,target.automationId,a=>{const items=a.parameters??[];return {...a,parameters:[...items,{id:createStableEditorId(entityId,items.map(item=>item.id)),entity:entityId,label:this.friendly(entityId),format:"auto"}]};});
    else if(target.kind==="parameter") this.updateParameter({kind:"automation",scenarioId:target.scenarioId,groupId:target.groupId,automationId:target.automationId},target.itemId,{entity:entityId});
    else if(target.kind==="binding") this.updateAutomation(target.scenarioId,target.groupId,target.automationId,a=>target.field==="enabled"?({...a,enabled_entity:entityId||undefined}):target.field==="device"?({...a,device:entityId?{...(a.device??{}),entity:entityId}:undefined}):({...a,[target.field]:entityId?{...((a[target.field] as ScenarioValueBinding|undefined)??{}),entity:entityId}:undefined}));
    else if(target.kind==="presentation") this.updateScenario(target.scenarioId,s=>{
      const progressFields={progress_current:"current_entity",progress_target:"target_entity",progress_estimated:"estimated_entity"} as const;
      const decisionFields={decision_summary:"summary_entity",decision_observed:"observed_entity",decision_threshold:"threshold_entity",decision_message:"message_entity"} as const;
      const nextFields={next_time:"time_entity",next_label:"label_entity",next_condition:"condition_entity"} as const;
      if(target.field in progressFields){const field=progressFields[target.field as keyof typeof progressFields];return {...s,progress:{...(s.progress??{}),[field]:entityId||undefined}};}
      if(target.field in decisionFields){const field=decisionFields[target.field as keyof typeof decisionFields];return {...s,explanation:{...(s.explanation??{}),decision_context:{...(s.explanation?.decision_context??{}),[field]:entityId||undefined}}};}
      const field=nextFields[target.field as keyof typeof nextFields];return {...s,next_decision:{...(s.next_decision??{}),[field]:entityId||undefined}};
    });
    else if(target.kind==="scenario-action-target") {
      const current=this.scenario(target.scenarioId)?.actions?.find(item=>item.id===target.itemId);
      this.updateScenarioAction(target.scenarioId,target.itemId,{target_entity:entityId,script_entity:undefined,service:serviceForReplacement(current?.service,entityId)});
    }
    else if(target.kind==="action-target") {
      const current=this.group(this.scenario(target.scenarioId)!,target.groupId)?.automations.find(item=>item.id===target.automationId)?.quick_actions?.find(item=>item.id===target.itemId);
      this.updateAction({kind:"automation",scenarioId:target.scenarioId,groupId:target.groupId,automationId:target.automationId},target.itemId,{target_entity:entityId,service:serviceForReplacement(current?.service,entityId)});
    }
    this.picker=undefined;
  }
  private friendly(entityId:string){return String(this.hass?.states[entityId]?.attributes.friendly_name??entityId);}
  private pickerDomain(target:PickerTarget){
    if(target.kind==="add-automation"||target.kind==="automation")return ["automation"];
    if(target.kind==="setting-override"){
      if(target.field==="active_entity")return ["input_boolean"];
      const entity=this.scenario(target.scenarioId)?.settings?.find(setting=>setting.id===target.itemId)?.entity??"";
      return entity.includes(".")?[entity.split(".",1)[0]]:[];
    }
    return [];
  }
  private pickerValue(target:PickerTarget):string {
    const scenario=this.scenario("scenarioId" in target?target.scenarioId:"");
    if(target.kind==="canonical")return target.entityId;
    if(target.kind==="add-control-entity")return this.addControlDraft?.entity??"";
    if(target.kind==="metric")return scenario?.metrics?.find(item=>item.entity===target.itemId)?.entity??"";
    if(target.kind==="setting")return scenario?.settings?.find(item=>item.id===target.itemId)?.entity??"";
    if(target.kind==="automation")return this.group(scenario!,target.groupId)?.automations.find(item=>item.id===target.automationId)?.entity??"";
    if(target.kind==="parameter")return this.group(scenario!,target.groupId)?.automations.find(item=>item.id===target.automationId)?.parameters?.find(item=>item.id===target.itemId)?.entity??"";
    if(target.kind==="binding"){const automation=this.group(scenario!,target.groupId)?.automations.find(item=>item.id===target.automationId);if(target.field==="enabled")return automation?.enabled_entity??"";return target.field==="device"?automation?.device?.entity??"":automation?.[target.field]?.entity??"";}
    if(target.kind==="setting-override") return this.scenario(target.scenarioId)?.settings?.find(setting=>setting.id===target.itemId)?.override?.[target.field]??"";
    if(target.kind==="presentation") {
      const scenario=this.scenario(target.scenarioId);
      const values:Record<Extract<PickerTarget,{kind:"presentation"}>["field"],string|undefined>={
        progress_current:scenario?.progress?.current_entity,progress_target:scenario?.progress?.target_entity,progress_estimated:scenario?.progress?.estimated_entity,
        decision_summary:scenario?.explanation?.decision_context?.summary_entity,decision_observed:scenario?.explanation?.decision_context?.observed_entity,decision_threshold:scenario?.explanation?.decision_context?.threshold_entity,decision_message:scenario?.explanation?.decision_context?.message_entity,
        next_time:scenario?.next_decision?.time_entity,next_label:scenario?.next_decision?.label_entity,next_condition:scenario?.next_decision?.condition_entity,
      };
      return values[target.field]??"";
    }
    if(target.kind==="scenario-action-target") return this.scenario(target.scenarioId)?.actions?.find(item=>item.id===target.itemId)?.target_entity??"";
    if(target.kind!=="scenario") return "";
    const activeScenario=this.scenario(target.scenarioId);
    if(target.field==="strategy_entity") return activeScenario?.strategy?.entity??activeScenario?.strategy_entity??"";
    if(target.field==="status_entity") return activeScenario?.status_entity??"";
    if(target.field==="goal_entity")return activeScenario?.goal?.entity??"";
    if(target.field==="secondary_goal_entity")return activeScenario?.secondary_goal?.entity??"";
    if(target.field==="execution_entity")return activeScenario?.execution?.entity??activeScenario?.device_entity??"";
    if(target.field==="manual_override_entity")return activeScenario?.manual_override_entity??"";
    return activeScenario?.explanation?.[target.field]??activeScenario?.[target.field]??"";
  }

  render(){const view=this.view;const body=view.kind==="section"?this.renderSection():this.renderScenario({kind:"scenario",scenarioId:view.scenarioId});return html`${body}${this.renderItemEditor()}${this.renderDialogs()}`;}
  private renderItemEditor(){const view=this.view;if(view.kind==="metric")return this.itemDialog("Edit Highlight",this.renderMetricPage(view),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="add-control")return this.itemDialog("Add Control",this.renderAddControlPage(view.scenarioId),()=>{this.addControlDraft=undefined;this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="control")return this.itemDialog("Edit Control",this.renderControlPage(view),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="scenario-status")return this.itemDialog("Scenario Status",this.renderScenarioStatusPage(view.scenarioId),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="automation-activity")return this.itemDialog("Automation Activity",this.renderAutomationActivityPage(view.scenarioId),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="activity-footer")return this.itemDialog("Activity Footer",this.renderActivityFooterPage(view.scenarioId),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="group")return this.itemDialog("Edit Automation Group",this.renderGroup(view),()=>{this.view={kind:"scenario",scenarioId:view.scenarioId};});if(view.kind==="automation")return this.itemDialog("Edit Automation",this.renderAutomation(view),()=>{this.view={kind:"group",scenarioId:view.scenarioId,groupId:view.groupId};});return nothing;}
  private itemDialog(title:string,content:unknown,onClose:()=>void){return html`<ic-app-dialog class="item-editor-dialog" .open=${true} .title=${title} @dialog-close=${onClose}>${content}</ic-app-dialog>`;}
  private pickerCanClear(target:PickerTarget){return !target.kind.startsWith("add-")&&Boolean(this.pickerValue(target));}
  private renderDialogs(){return html`
    <automation-scenario-creation-flow .open=${this.creationOpen} .hass=${this.hass} .existingIds=${this.config.scenarios.map(item=>item.id??"")} @scenario-creation-close=${()=>{this.creationOpen=false;}} @scenario-created=${(event:CustomEvent<ScenarioCreatedDetail>)=>{const scenario=event.detail.scenario;this.updateScenarios([...this.config.scenarios,scenario]);this.creationOpen=false;this.view={kind:"scenario",scenarioId:scenario.id!};}}></automation-scenario-creation-flow>
    <ic-app-dialog .open=${Boolean(this.picker)} title=${this.picker?.kind==="add-automation"?"Link Existing Automation":"Select Entity"} @dialog-close=${()=>{if(this.picker?.kind==="add-metric")this.pendingMetricHighlight=undefined;this.picker=undefined;}}>${this.picker?html`<div class="picker"><ic-entity-selector variant="inline" .hass=${this.hass} .value=${this.pickerValue(this.picker)} .filter=${{domains:this.pickerDomain(this.picker)}} @entity-selected=${(event:CustomEvent<EntitySelectedDetail>)=>this.applyEntity(this.picker!,event.detail.entityId)}></ic-entity-selector><div class="picker-actions">${this.pickerCanClear(this.picker)?html`<ic-button variant="secondary" @click=${()=>this.applyEntity(this.picker!,"")}>Clear</ic-button>`:nothing}<ic-button @click=${()=>{if(this.picker?.kind==="add-metric")this.pendingMetricHighlight=undefined;this.picker=undefined;}}>Cancel</ic-button></div></div>`:nothing}</ic-app-dialog>
    <ic-app-dialog .open=${this.blueprintOpen} title="Use Blueprint" @dialog-close=${()=>{this.blueprintOpen=false;}}><div class="template-list"><p class="dialog-copy">Blueprint-based automations are created in Home Assistant. Create the automation there, then return here and use Link Existing Automation.</p><ic-button variant="secondary" @click=${()=>{this.blueprintOpen=false;}}>Close</ic-button></div></ic-app-dialog>
    <ic-confirm-dialog .open=${Boolean(this.confirmTarget)} .title=${this.confirmTarget?.title??"Remove item?"} .message=${this.confirmTarget?.label??""} .confirmLabel=${this.confirmTarget?.confirmLabel??"Remove"} @confirm-cancel=${()=>{this.confirmTarget=undefined;}} @confirm-accept=${()=>{const run=this.confirmTarget?.run;this.confirmTarget=undefined;run?.();}}></ic-confirm-dialog>`;}
}

if(!customElements.get("energy-automation-section-editor")) customElements.define("energy-automation-section-editor",EnergyAutomationSectionEditor);
