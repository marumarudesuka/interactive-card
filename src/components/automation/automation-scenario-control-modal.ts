import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { NormalizedAutomationScenario } from "../../automation/automation-scenario.types.ts";
import { classifyScenarioSettings, getAssociatedDeviceSettings, getAutomationParticipation, getPresentedScenarioActions, getScenarioExecutionSetting, selectAutomationId, shouldPresentReadOnlyStrategy } from "../../automation/automation-runtime-ui.ts";
import { getPresentedAutomationQuickActions } from "../../automation/automation-runtime-ui.ts";
import { openAutomationEditorOrMoreInfo } from "../../automation/native-automation-editor-launcher.ts";
import type { AutomationSelectionDetail } from "./automation-selector.ts";
import "../common/app-dialog.ts";
import "./scenario-setting-control.ts";
import "./automation-selector.ts";
import "./automation-detail.ts";

export class AutomationScenarioControlModal extends LitElement {
  static properties = {
    open:{ type:Boolean, reflect:true }, hass:{ attribute:false }, scenario:{ attribute:false },
    selectedAutomationId:{ state:true }, showAllSettings:{ state:true },
    hasStatusBinding:{ type:Boolean, attribute:false }, strategyLabel:{ type:String, attribute:false }, strategyEntityId:{ type:String, attribute:false }, manualOverrideEntityId:{ type:String, attribute:false },
  };
  open = false;
  hass?:HomeAssistant;
  scenario?:NormalizedAutomationScenario;
  hasStatusBinding = false;
  strategyLabel = "Strategy";
  strategyEntityId = "";
  manualOverrideEntityId = "";
  private selectedAutomationId = "";
  private showAllSettings = false;

  static styles = css`
    :host { display:contents; }
    ic-app-dialog { --dialog-width:min(660px,calc(100vw - 48px)); --dialog-header-min-height:auto; --dialog-header-padding:16px 24px; --dialog-body-padding:18px 24px 24px; --en-heading-primary:var(--en-text-primary,var(--primary-text-color)); }
    .header { display:grid; min-width:0; flex:1 1 auto; align-content:center; gap:2px; }
    .title { overflow:hidden; color:var(--en-heading-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-title-lg-size,24px); font-weight:var(--en-title-lg-weight,600); line-height:var(--en-title-lg-line-height,1.2); letter-spacing:var(--en-title-lg-letter-spacing,-.3px); text-overflow:ellipsis; white-space:nowrap; }
    .content { display:grid; min-width:0; gap:12px; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); line-height:var(--en-body-line-height,1.4); container-type:inline-size; }
    section { display:grid; min-width:0; gap:8px; }
    section.linked { padding-top:8px; border-top:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    h2 { margin:0; color:var(--en-heading-primary,var(--en-text-primary,var(--primary-text-color))); font-size:var(--en-title-md-size,18px); font-weight:var(--en-title-md-weight,600); line-height:var(--en-title-md-line-height,1.25); letter-spacing:var(--en-title-md-letter-spacing,-.1px); }
    .section-heading { display:flex; min-width:0; align-items:baseline; justify-content:space-between; gap:12px; }
    .section-meta { overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); text-overflow:ellipsis; white-space:nowrap; }
    .status-fact { min-width:0; }
    .meta-label { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .meta-value { margin-top:4px; overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; text-overflow:ellipsis; white-space:nowrap; }
    .settings { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 16px; }
    .settings.single { grid-template-columns:minmax(0,320px); }
    .setting-item { min-width:0; }
    .more { justify-self:start; border:0; border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); padding:4px 6px; background:transparent; color:var(--en-color-primary); cursor:pointer; font:inherit; font-size:var(--en-helper-size,13px); font-weight:600; }
    .more:hover,.edit-link:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .status-summary { padding:5px 10px; border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); background:color-mix(in srgb,var(--en-surface-control,rgba(127,127,127,.08)) 72%,transparent); }
    .status-summary.with-reason { padding-block:8px; }
    .status-primary { display:grid; min-width:0; grid-template-columns:8px minmax(0,1fr); align-items:start; gap:8px; }
    .status-copy { display:grid; min-width:0; gap:3px; }
    .status-line { min-width:0; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:600; line-height:var(--en-body-line-height,1.4); }
    .status-dot { width:8px; height:8px; margin-top:5px; flex:0 0 8px; border-radius:50%; background:var(--en-text-secondary,var(--secondary-text-color)); opacity:.55; }
    .status-dot.success { background:var(--en-color-success); opacity:1; }
    .status-dot.warning { background:var(--en-color-warning,var(--en-color-accent)); opacity:1; }
    .status-dot.critical { background:var(--error-color); opacity:1; }
    .reason { display:-webkit-box; overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-body-line-height,1.4); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
    .automation-warning { color:var(--en-color-warning,var(--en-color-accent)); font-size:var(--en-helper-size,13px); font-weight:500; }
    .status-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 20px; }
    .empty { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-body-size,14px); font-weight:var(--en-helper-weight,400); line-height:var(--en-body-line-height,1.4); }
    .device-groups { display:grid; min-width:0; gap:0; }
    .device-control-row { display:grid; min-width:0; min-height:40px; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:0; border-bottom:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .device-control-row:last-child { border-bottom:0; }
    .device-control-row scenario-setting-control { grid-column:1 / -1; }
    .device-group-title { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    .modal-footer { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; margin-top:0; padding-top:8px; border-top:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .edit-link { border:0; border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); padding:4px 6px; background:transparent; color:var(--en-color-primary); cursor:pointer; font:inherit; font-size:var(--en-helper-size,13px); font-weight:600; white-space:nowrap; }
    .strategy-field { display:grid; min-width:0; align-content:start; gap:4px; }
    @container (max-width:520px) { .settings,.settings.single,.status-facts { grid-template-columns:1fr; } .section-heading { align-items:flex-start; flex-direction:column; gap:3px; } .device-control-row { grid-template-columns:1fr; align-items:start; } .device-control-row automation-detail { justify-self:start; } }
    @media (max-width:600px) { ic-app-dialog { --dialog-width:calc(100vw - 12px); --dialog-header-padding:12px 16px; --dialog-body-padding:14px 16px 18px; } }
  `;

  protected updated(changed:PropertyValues<this>) {
    if ((changed.has("open") || changed.has("scenario")) && this.open) this.ensureSelection();
  }

  private ensureSelection() {
    const groups = this.scenario?.automationGroups ?? [];
    this.selectedAutomationId = selectAutomationId(groups,this.selectedAutomationId);
  }

  private selectAutomation(automationId:string) {
    this.selectedAutomationId = automationId;
  }

  private close() {
    this.dispatchEvent(new CustomEvent("automation-control-close", { bubbles:true, composed:true }));
  }

  render() {
    const scenario = this.scenario;
    if (!scenario) return nothing;
    const selected = scenario.automationGroups.flatMap(group=>group.automations).find((item) => item.id === this.selectedAutomationId);
    const participation = getAutomationParticipation(scenario.automationGroups);
    const executionSetting=getScenarioExecutionSetting(scenario);
    const associatedDeviceSettings=getAssociatedDeviceSettings(scenario);
    const allSettings=[...scenario.settings,...(executionSetting?[executionSetting]:[]),...associatedDeviceSettings];
    const classifiedSettings = classifyScenarioSettings(allSettings,scenario.automationGroups,this.manualOverrideEntityId,scenario.actions);
    const scenarioSettings = classifiedSettings.scenario;
    const deviceSettings = classifiedSettings.device;
    const observedSettings = classifiedSettings.observed;
    const hasObservedTemperature=observedSettings.some(setting=>String(setting.entityAttributes?.device_class??"")==="temperature"||/[°]?[CF]$/i.test(setting.unit??""));
    const displayedSettings = this.showAllSettings ? scenarioSettings : scenarioSettings.slice(0,4);
    const controlledEntityIds = [...scenarioSettings,...deviceSettings,...(classifiedSettings.manualOverride?[classifiedSettings.manualOverride]:[])]
      .filter((setting) => setting.control !== "unsupported")
      .map((setting) => setting.entityId);
    const presentedScenarioActions = getPresentedScenarioActions(scenario.actions,controlledEntityIds);
    const showReadOnlyStrategy = shouldPresentReadOnlyStrategy(scenario,this.strategyEntityId);
    const actionGroups = scenario.automationGroups.map((group) => ({
      group,
      automations:group.automations.map((automation) => ({
        automation,
        actions:getPresentedAutomationQuickActions(automation,presentedScenarioActions,controlledEntityIds),
      })).filter((item) => item.actions.length > 0),
    })).filter((item) => item.automations.length > 0);
    const scenarioActionGroups = new Map<string,{label:string;actions:typeof scenario.actions}>();
    for (const action of presentedScenarioActions) {
      const group=scenario.automationGroups.find((item)=>item.id===action.group_id);
      const id=group?.id ?? action.group_id ?? "actions";
      const current=scenarioActionGroups.get(id) ?? {label:group?.label ?? "Actions",actions:[]};
      current.actions.push(action);
      scenarioActionGroups.set(id,current);
    }
    const hasDeviceControls = deviceSettings.length > 0 || actionGroups.length > 0 || presentedScenarioActions.length > 0;
    const showScenarioControl = Boolean(showReadOnlyStrategy || scenarioSettings.length);
    const settingEntityIds = scenario.settings.map((setting) => setting.entityId);
    const automationStateConflict=scenario.lifecycle.status==="running"&&participation.header==="Inactive";
    return html`<ic-app-dialog .open=${this.open} .title=${scenario.identity.title} @dialog-close=${this.close}>
      <div slot="header" class="header"><div class="title">${scenario.identity.title}</div></div>
      <div class="content">
        <div class="status-summary ${scenario.explanation.reason?"with-reason":""}"><div class="status-primary"><span class="status-dot ${scenario.lifecycle.tone}"></span><div class="status-copy"><div class="status-line">${scenario.lifecycle.label}</div>${scenario.explanation.reason?html`<div class="reason">${scenario.explanation.reason}</div>`:nothing}</div></div></div>
        ${showScenarioControl ? html`<section><h2>Scenario Control</h2>
          <div class="settings ${displayedSettings.length + (showReadOnlyStrategy?1:0) === 1 ? "single" : ""}">${showReadOnlyStrategy ? html`<div class="setting-item strategy-field"><span class="meta-label">${this.strategyLabel}</span><span class="meta-value">${scenario.strategy?.label}</span></div>` : nothing}${displayedSettings.map((setting) => html`<div class="setting-item"><scenario-setting-control .hass=${this.hass} .setting=${setting}></scenario-setting-control></div>`)}</div>
          ${scenarioSettings.length > 4 ? html`<button class="more" type="button" @click=${() => { this.showAllSettings = !this.showAllSettings; }}>${this.showAllSettings ? "Show fewer settings" : `More Settings (${scenarioSettings.length - 4}) →`}</button>` : nothing}
        </section>` : nothing}
        ${hasDeviceControls ? html`<section><h2>Device Controls</h2><div class="device-groups">
          ${deviceSettings.map((setting)=>html`<div class="device-control-row"><scenario-setting-control compact-row .hass=${this.hass} .setting=${setting} .suppressCurrentTemperature=${hasObservedTemperature}></scenario-setting-control></div>`)}
          ${[...scenarioActionGroups.values()].map(({label,actions})=>html`<div class="device-control-row"><div class="device-group-title">${label}</div><automation-detail compact actions-only .hass=${this.hass} .actions=${actions}></automation-detail></div>`)}
          ${actionGroups.map(({group,automations})=>automations.map(({actions})=>html`<div class="device-control-row"><div class="device-group-title">${group.label}</div><automation-detail compact actions-only .hass=${this.hass} .actions=${actions}></automation-detail></div>`))}
        </div></section>` : nothing}
        <section class="linked"><div class="section-heading"><h2>Linked Automations</h2><span class="section-meta">${participation.summary}</span></div>${automationStateConflict?html`<div class="automation-warning">Automation disabled</div>`:nothing}${scenario.automationGroups.length ? html`
          <automation-selector .hass=${this.hass} .groups=${scenario.automationGroups} .selectedId=${this.selectedAutomationId}
            @automation-selected=${(event:CustomEvent<AutomationSelectionDetail>) => this.selectAutomation(event.detail.automationId)}></automation-selector>
          ${selected ? html`<automation-detail hide-actions hide-edit .hass=${this.hass} .automation=${selected} .excludedEntityIds=${settingEntityIds}></automation-detail>` : html`<div class="empty">Select an automation to inspect.</div>`}
        ` : html`<div class="empty">No linked automations.</div>`}</section>
        ${classifiedSettings.manualOverride || selected ? html`<div class="modal-footer">${classifiedSettings.manualOverride ? html`<scenario-setting-control compact-row inline-toggle .hass=${this.hass} .setting=${classifiedSettings.manualOverride}></scenario-setting-control>` : html`<span></span>`}${selected ? html`<button class="edit-link" type="button" @click=${() => openAutomationEditorOrMoreInfo(this,selected)}>Edit in HA →</button>` : nothing}</div>` : nothing}
      </div>
    </ic-app-dialog>`;
  }
}
customElements.define("automation-scenario-control-modal",AutomationScenarioControlModal);
