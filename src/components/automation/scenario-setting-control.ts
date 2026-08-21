import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { ResolvedScenarioSetting } from "../../automation/automation-scenario.types.ts";
import { AutomationSettingChangeExecutor, updateAutomationSetting } from "../../automation/automation-setting-executor.ts";
import { resolveScenarioSettingPresentationControl } from "../../automation/automation-runtime-ui.ts";
import type { SelectFieldChangeDetail } from "../common/select-field.ts";
import type { FieldValueDetail } from "../common/field.ts";
import "../common/select-field.ts";
import "../common/field.ts";
import type { ToggleChangeDetail } from "../common/toggle.ts";
import "../common/toggle.ts";
import "../common/app-dialog.ts";
import "../common/button.ts";
import type { SegmentedChangeDetail } from "../common/segmented-control.ts";
import "../common/segmented-control.ts";
import { formatMetric } from "../../helpers/metric-formatter.ts";

export class ScenarioSettingControl extends LitElement {
  static properties = { hass:{ attribute:false }, setting:{ attribute:false }, compactRow:{ type:Boolean, attribute:"compact-row", reflect:true }, inlineToggle:{type:Boolean,attribute:"inline-toggle",reflect:true}, suppressCurrentTemperature:{ type:Boolean, attribute:"suppress-current-temperature" }, pending:{ state:true }, error:{ state:true }, applyOpen:{ state:true }, draftValue:{ state:true } };
  hass?:HomeAssistant;
  setting?:ResolvedScenarioSetting;
  compactRow = false;
  inlineToggle = false;
  suppressCurrentTemperature = false;
  private pending = false;
  private error = "";
  private applyOpen = false;
  private draftValue:string|number|boolean = "";
  private readonly changeExecutor = new AutomationSettingChangeExecutor();

  static styles = css`
    :host { display:grid; min-width:0; gap:var(--en-control-gap,8px); color:var(--en-text-primary,var(--primary-text-color)); container-type:inline-size; }
    .row { display:grid; min-width:0; align-content:start; gap:var(--en-control-gap,8px); }
    .label { min-width:0; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .value { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    ic-select-field,ic-field { --en-control-height:40px; --en-control-padding-inline:var(--en-control-padding-inline-compact,14px); --en-control-font-size:var(--en-body-size,14px); }
    ic-select-field,ic-field { width:100%; }
    .boolean-control { display:flex; width:100%; min-width:0; min-height:40px; box-sizing:border-box; align-items:center; justify-content:space-between; gap:12px; padding-inline:4px; }
    .boolean-control .label { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    .boolean-control ic-toggle { flex:0 0 auto; }
    .control-state { margin-left:auto; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); }
    .device-summary { display:grid; min-width:0; gap:4px; }
    .device-summary-head { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; }
    .device-state { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .device-attributes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px 18px; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); }
    .device-attribute { display:flex; justify-content:space-between; gap:8px; }
    .device-more { border:0; border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); padding:4px 6px; background:transparent; color:var(--en-color-primary); cursor:pointer; font:inherit; font-size:var(--en-helper-size,13px); font-weight:600; }
    .device-more:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .device-control { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px; }
    .device-control-label { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); }
    .temperature-control,.cover-actions { display:flex; align-items:center; gap:6px; }
    .compact-action { min-width:40px; min-height:40px; border:var(--ic-border-control,var(--en-border,1px solid var(--divider-color))); border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); background:var(--ic-control-background,var(--en-surface-control,transparent)); color:var(--en-text-primary,var(--primary-text-color)); cursor:pointer; font:inherit; font-size:var(--en-body-size,14px); font-weight:500; }
    .compact-action:hover:not(:disabled) { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .compact-action:disabled { cursor:default; opacity:.45; }
    .range-control { display:grid; grid-template-columns:auto minmax(100px,1fr); align-items:center; gap:10px; }
    input[type="range"] { width:100%; min-width:100px; min-height:40px; accent-color:var(--en-color-primary); }
    .device-select { min-width:140px; --en-control-height:40px; }
    .error { color:var(--error-color); font-size:var(--en-helper-size,13px); line-height:var(--en-helper-line-height,1.3); }
    .override-meta { display:grid; gap:2px; min-width:0; }
    .override-badge { color:var(--en-color-primary); font-size:var(--en-helper-size,13px); font-weight:600; }
    .regular-value { overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); text-overflow:ellipsis; white-space:nowrap; }
    ic-app-dialog { --dialog-width:min(440px,calc(100vw - 24px)); --dialog-header-min-height:64px; --dialog-header-padding:16px 20px; --dialog-body-padding:16px 20px 20px; }
    .apply-content { display:grid; gap:14px; }
    .change-summary { display:grid; gap:4px; }
    .change-label { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); }
    .change-value { color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-title-md-size,18px); font-weight:var(--en-title-md-weight,600); }
    .choices { display:grid; gap:8px; }
    .choice { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .choice:last-child { border-bottom:0; }
    .choice-copy { display:grid; gap:2px; }
    .choice-title { color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); }
    .choice-description { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); }
    .apply-footer { display:flex; justify-content:flex-end; }
    .select-fallback { display:none; }
    :host([compact-row]) { gap:2px; }
    :host([compact-row]) .row:not(.toggle-row) { grid-template-columns:minmax(0,1fr) minmax(140px,220px); align-items:center; gap:12px; }
    :host([compact-row]) .row:not(.toggle-row) .label { color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; }
    :host([compact-row]) .boolean-control { min-height:40px; padding-inline:0; }
    :host([inline-toggle]) .boolean-control { width:max-content; max-width:100%; justify-content:flex-start; gap:10px; }
    :host([compact-row]) ic-select-field,:host([compact-row]) ic-field { --en-control-height:40px; width:100%; }
    @container (max-width:360px) { .segmented-only { display:none; } .select-fallback { display:block; } .device-control,.range-control { grid-template-columns:1fr; } .device-select { min-width:0; width:100%; } .temperature-control,.cover-actions { justify-self:start; flex-wrap:wrap; } }
  `;

  private async applyValue(value:string|number|boolean) {
    if (!this.hass || !this.setting || this.pending) return;
    this.pending = true; this.error = "";
    try { await updateAutomationSetting(this.hass,this.setting,value); }
    catch (error) { this.error = error instanceof Error ? error.message : String(error); }
    finally { this.pending = false; }
  }

  private requestValue(value:string|number|boolean) {
    if (!this.setting || this.pending) return;
    if (this.setting.changeMode !== "next_run") { void this.applyValue(value); return; }
    this.draftValue=value;
    this.error="";
    this.applyOpen=true;
  }

  private async applyChoice(mode:"once"|"permanent") {
    if (!this.hass || !this.setting || this.pending) return;
    this.pending=true; this.error="";
    try {
      if (mode === "once") await this.changeExecutor.setOnce(this.hass,this.setting,this.draftValue);
      else await this.changeExecutor.setPermanently(this.hass,this.setting,this.draftValue);
      this.applyOpen=false;
    } catch(error) { this.error=error instanceof Error ? error.message : String(error); }
    finally { this.pending=false; }
  }

  private presentationControl(setting:ResolvedScenarioSetting) {
    const attributes = this.hass?.states[setting.entityId]?.attributes;
    return resolveScenarioSettingPresentationControl(setting,attributes);
  }

  private presentationValue(setting:ResolvedScenarioSetting,control:string) {
    if (control === "time") return setting.rawValue.includes(" ")
      ? setting.rawValue.split(" ").at(-1)?.slice(0,5) ?? setting.rawValue
      : setting.rawValue.slice(0,5);
    if (control === "datetime") return setting.rawValue.replace(" ","T").slice(0,16);
    return setting.rawValue;
  }

  private formatAttribute(value:unknown,unit:string,decimals=1) {
    const numeric=typeof value==="number"?value:Number(value);
    if (!Number.isFinite(numeric)) return "--";
    const formatted=formatMetric({entityId:"",name:"",value:numeric,status:"valid",unit},{unit,decimals,trimTrailingZeros:false});
    return `${formatted.value}${formatted.unit?` ${formatted.unit}`:""}`;
  }

  private openMoreInfo(entityId:string) {
    this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId},bubbles:true,composed:true}));
  }

  private async callDeviceService(domain:string,service:string,entityId:string,data:Record<string,unknown>={}) {
    if (!this.hass||this.pending) return;
    this.pending=true; this.error="";
    try { await this.hass.callService(domain,service,{entity_id:entityId,...data}); }
    catch(error) { this.error=error instanceof Error?error.message:String(error); }
    finally { this.pending=false; }
  }

  private numericAttribute(attributes:Record<string,unknown>,key:string):number|undefined {
    const value=Number(attributes[key]);
    return Number.isFinite(value)?value:undefined;
  }

  private renderCapabilityDevice(setting:ResolvedScenarioSetting) {
    const domain=setting.entityDomain??setting.entityId.split(".",1)[0];
    const attributes=setting.entityAttributes??this.hass?.states[setting.entityId]?.attributes??{};
    if (!["climate","fan","water_heater","cover","light"].includes(domain)) return nothing;
    const unavailable=!setting.available;
    const state=unavailable?setting.value:String(attributes.hvac_action??setting.value).replace(/_/g," ").replace(/^./,letter=>letter.toUpperCase());
    const temperatureUnit=String(this.hass?.config?.unit_system?.temperature??"°C");
    const target=this.numericAttribute(attributes,"temperature");
    const current=this.numericAttribute(attributes,"current_temperature");
    const percentage=this.numericAttribute(attributes,"percentage");
    const supported=Number(attributes.supported_features??0);
    const climateMode=this.hass?.states[setting.entityId]?.state;
    const isClimate=domain==="climate",isWaterHeater=domain==="water_heater";
    const operationMode=String(attributes.operation_mode??setting.rawValue??"");
    const summaryTarget=(isClimate||isWaterHeater)&&target!==undefined&&!unavailable?` · Target ${this.formatAttribute(target,temperatureUnit)}`:"";
    const temperatureSupported=(isClimate&&(supported&1)!==0)||(isWaterHeater&&(supported&1)!==0);
    const temperatureStep=this.numericAttribute(attributes,"target_temp_step")??1;
    const minTemperature=this.numericAttribute(attributes,"min_temp")??Number.NEGATIVE_INFINITY;
    const maxTemperature=this.numericAttribute(attributes,"max_temp")??Number.POSITIVE_INFINITY;
    const modes=(isClimate?attributes.hvac_modes:attributes.operation_list) as unknown;
    const modeOptions=Array.isArray(modes)?modes.filter((mode):mode is string=>typeof mode==="string"):[];
    const modeSupported=isClimate?modeOptions.length>0:isWaterHeater&&(supported&2)!==0&&modeOptions.length>0;
    const position=this.numericAttribute(attributes,"current_position");
    const brightness=this.numericAttribute(attributes,"brightness");
    const brightnessPercentage=brightness===undefined?undefined:Math.round(brightness/255*100);
    return html`<div class="device-summary"><div class="device-summary-head"><div><div class="value">${setting.label}</div><div class="device-state">${state}${summaryTarget}</div></div>${domain==="fan"||domain==="light"?html`<ic-toggle label=${setting.label} .checked=${setting.rawValue==="on"} .pending=${this.pending} .unavailable=${unavailable} @toggle-change=${(event:CustomEvent<ToggleChangeDetail>)=>this.requestValue(event.detail.checked)}></ic-toggle>`:html`<button class="device-more" type="button" @click=${()=>this.openMoreInfo(setting.entityId)}>Open in HA</button>`}</div>
      ${!unavailable&&(isClimate||isWaterHeater)?html`<div class="device-attributes">${!this.suppressCurrentTemperature&&current!==undefined?html`<div class="device-attribute"><span>Current</span><span>${this.formatAttribute(current,temperatureUnit)}</span></div>`:nothing}${target!==undefined?html`<div class="device-attribute"><span>Target</span><span>${this.formatAttribute(target,temperatureUnit)}</span></div>`:nothing}${(isClimate?climateMode:operationMode)?html`<div class="device-attribute"><span>Mode</span><span>${(isClimate?climateMode:operationMode)?.replace(/_/g," ")}</span></div>`:nothing}</div>`:nothing}
      ${temperatureSupported&&target!==undefined?html`<div class="device-control"><span class="device-control-label">Target</span><div class="temperature-control"><button class="compact-action" type="button" .disabled=${this.pending||target<=minTemperature} @click=${()=>this.callDeviceService(domain,"set_temperature",setting.entityId,{temperature:Math.max(minTemperature,target-temperatureStep)})}>−</button><span>${this.formatAttribute(target,temperatureUnit)}</span><button class="compact-action" type="button" .disabled=${this.pending||target>=maxTemperature} @click=${()=>this.callDeviceService(domain,"set_temperature",setting.entityId,{temperature:Math.min(maxTemperature,target+temperatureStep)})}>+</button></div></div>`:nothing}
      ${modeSupported?html`<div class="device-control"><span class="device-control-label">Mode</span><ic-select-field class="device-select" .value=${isClimate?climateMode??"":operationMode} .options=${modeOptions.map(value=>({value,label:value.replace(/_/g," ")}))} .disabled=${this.pending} @select-change=${(event:CustomEvent<SelectFieldChangeDetail>)=>this.callDeviceService(domain,isClimate?"set_hvac_mode":"set_operation_mode",setting.entityId,isClimate?{hvac_mode:event.detail.value}:{operation_mode:event.detail.value})}></ic-select-field></div>`:nothing}
      ${domain==="fan"&&percentage!==undefined&&(supported&1)!==0?html`<div class="range-control"><span class="device-control-label">Speed ${this.formatAttribute(percentage,"%",0)}</span><input type="range" min="0" max="100" step=${String(attributes.percentage_step??1)} .value=${String(percentage)} .disabled=${this.pending} @change=${(event:Event)=>this.callDeviceService("fan","set_percentage",setting.entityId,{percentage:Number((event.target as HTMLInputElement).value)})}></div>`:nothing}
      ${domain==="cover"?html`<div class="device-control"><span class="device-control-label">${position!==undefined&&(supported&4)!==0?`Position ${position}%`:state}</span><div class="cover-actions">${(supported&2)!==0?html`<button class="compact-action" type="button" .disabled=${this.pending} @click=${()=>this.callDeviceService("cover","close_cover",setting.entityId)}>Close</button>`:nothing}${(supported&8)!==0?html`<button class="compact-action" type="button" .disabled=${this.pending} @click=${()=>this.callDeviceService("cover","stop_cover",setting.entityId)}>Stop</button>`:nothing}${(supported&1)!==0?html`<button class="compact-action" type="button" .disabled=${this.pending} @click=${()=>this.callDeviceService("cover","open_cover",setting.entityId)}>Open</button>`:nothing}</div></div>`:nothing}
      ${domain==="light"&&brightnessPercentage!==undefined&&(supported&1)!==0?html`<div class="range-control"><span class="device-control-label">Brightness ${brightnessPercentage}%</span><input type="range" min="1" max="100" .value=${String(brightnessPercentage)} .disabled=${this.pending} @change=${(event:Event)=>this.callDeviceService("light","turn_on",setting.entityId,{brightness_pct:Number((event.target as HTMLInputElement).value)})}></div>`:nothing}
      ${this.error?html`<div class="error" role="alert">${this.error}</div>`:nothing}
    </div>`;
  }

  render() {
    const setting = this.setting;
    if (!setting) return nothing;
    const presentationControl = this.presentationControl(setting);
    const presentationValue = this.presentationValue(setting,presentationControl);
    const capabilityDevice=this.renderCapabilityDevice(setting);
    if (capabilityDevice!==nothing) return capabilityDevice;
    if (setting.control === "toggle") return html`<div class="row toggle-row"><div class="boolean-control"><span class="label">${setting.label}</span>${!setting.available?html`<span class="control-state">${setting.value}</span>`:nothing}<ic-toggle label=${setting.label} .checked=${setting.rawValue === "on"} .pending=${this.pending} .unavailable=${!setting.available} @toggle-change=${(event:CustomEvent<ToggleChangeDetail>) => this.requestValue(event.detail.checked)}></ic-toggle></div>${setting.override?.active ? html`<div class="override-meta"><span class="override-badge">One-time override</span><span class="regular-value">Regular ${setting.regularValue}${setting.unit ? ` ${setting.unit}` : ""}</span></div>` : nothing}</div>${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
      <ic-app-dialog .open=${this.applyOpen} title="Apply Change" @dialog-close=${()=>{if(!this.pending)this.applyOpen=false;}}><div class="apply-content"><div class="change-summary"><span class="change-label">${setting.label}</span><span class="change-value">${setting.value} → ${String(this.draftValue)}</span></div><div class="choices"><div class="choice"><div class="choice-copy"><span class="choice-title">Just Once</span><span class="choice-description">Use this value for the next run only.</span></div><ic-button variant="primary" .disabled=${this.pending || !setting.override?.available} .loading=${this.pending} @click=${()=>this.applyChoice("once")}>Just Once</ic-button></div><div class="choice"><div class="choice-copy"><span class="choice-title">Permanently</span><span class="choice-description">Use this as the regular setting.</span></div><ic-button .disabled=${this.pending || !setting.regularAvailable} .loading=${this.pending} @click=${()=>this.applyChoice("permanent")}>Permanently</ic-button></div></div>${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}<div class="apply-footer"><ic-button .disabled=${this.pending} @click=${()=>{this.applyOpen=false;}}>Cancel</ic-button></div></div></ic-app-dialog>`;
    let control = html`<span class="value">${setting.value}${setting.unit ? ` ${setting.unit}` : ""}</span>`;
    const selectOptions=(setting.options??[]).map(value=>({value,label:value}));
    const selectControl=html`<ic-select-field .value=${setting.rawValue} .options=${selectOptions} .disabled=${this.pending || !setting.available} @select-change=${(event:CustomEvent<SelectFieldChangeDetail>) => this.requestValue(event.detail.value)}></ic-select-field>`;
    if (setting.control === "select") control = selectControl;
    const segmentedEligible=selectOptions.length>0&&selectOptions.length<=4&&selectOptions.every(option=>option.label.length<=14)&&selectOptions.reduce((sum,option)=>sum+option.label.length,0)<=36;
    if (setting.control === "select" && setting.presentation === "segmented" && segmentedEligible) control=html`<div class="segmented-only"><ic-segmented-control width="full" .label=${setting.label} .value=${setting.rawValue} .options=${selectOptions} .disabled=${this.pending||!setting.available} @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>)=>this.requestValue(event.detail.value)}></ic-segmented-control></div><div class="select-fallback">${selectControl}</div>`;
    if (setting.control === "number") control = html`<ic-field variant="compact" type="number" .value=${setting.rawValue} .disabled=${this.pending || !setting.available} @field-change=${(event:CustomEvent<FieldValueDetail>) => this.requestValue(event.detail.value)}></ic-field>`;
    if (presentationControl === "time" || presentationControl === "datetime") control = html`<ic-field variant="compact" .type=${presentationControl === "time" ? "time" : "datetime-local"} .value=${presentationValue} .disabled=${this.pending || !setting.available} @field-change=${(event:CustomEvent<FieldValueDetail>) => this.requestValue(event.detail.value)}></ic-field>`;
    return html`<div class="row"><span class="label">${setting.label}</span>${control}${setting.override?.active ? html`<div class="override-meta"><span class="override-badge">One-time override</span><span class="regular-value">Regular ${setting.regularValue}${setting.unit ? ` ${setting.unit}` : ""}</span></div>` : nothing}</div>${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
      <ic-app-dialog .open=${this.applyOpen} title="Apply Change" @dialog-close=${()=>{if(!this.pending)this.applyOpen=false;}}><div class="apply-content"><div class="change-summary"><span class="change-label">${setting.label}</span><span class="change-value">${setting.value} → ${String(this.draftValue)}</span></div><div class="choices"><div class="choice"><div class="choice-copy"><span class="choice-title">Just Once</span><span class="choice-description">Use this value for the next run only.</span></div><ic-button variant="primary" .disabled=${this.pending || !setting.override?.available} .loading=${this.pending} @click=${()=>this.applyChoice("once")}>Just Once</ic-button></div><div class="choice"><div class="choice-copy"><span class="choice-title">Permanently</span><span class="choice-description">Use this as the regular setting.</span></div><ic-button .disabled=${this.pending || !setting.regularAvailable} .loading=${this.pending} @click=${()=>this.applyChoice("permanent")}>Permanently</ic-button></div></div>${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}<div class="apply-footer"><ic-button .disabled=${this.pending} @click=${()=>{this.applyOpen=false;}}>Cancel</ic-button></div></div></ic-app-dialog>`;
  }
}
customElements.define("scenario-setting-control",ScenarioSettingControl);
