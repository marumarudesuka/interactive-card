import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import { resolveAutomationScenario } from "../helpers/automation-scenario-resolver.ts";
import type { AutomationServiceAction, EnergyAutomationCardConfig } from "../types/automation-scenario.ts";
import "./common/glass-container";
import "./common/action-button";
import "./common/button";
import "./common/metric-value";

type ScenarioActionKey = "pause" | "run_now" | "stop";

const REQUIRED_CONFIG_KEYS = [
  "status_entity", "strategy_entity", "reason_entity", "target_time_entity",
  "manual_override_entity", "device_entity",
] as const;

export class EnergyAutomationCard extends LitElement {
  static properties = {
    config:{ attribute:false }, actionPending:{ state:true }, actionError:{ state:true },
  };

  config?: EnergyAutomationCardConfig;
  private _hass?: HomeAssistant;
  private actionPending?: ScenarioActionKey | "manual_override" | "device";
  private actionError = "";

  set hass(hass: HomeAssistant) { this._hass = hass; this.requestUpdate(); }
  get hass(): HomeAssistant | undefined { return this._hass; }

  setConfig(config: EnergyAutomationCardConfig) {
    if (!config || typeof config !== "object") throw new Error("Automation Card requires a configuration");
    for (const key of REQUIRED_CONFIG_KEYS) {
      if (!String(config[key] ?? "").trim()) throw new Error(`Automation Card requires ${key}`);
    }
    this.config = {
      ...config,
      title:config.title?.trim() || "Automation Scenario",
      icon:config.icon?.trim() || "mdi:white-balance-sunny",
    };
  }

  getGridOptions() { return { columns:"full", rows:6, min_rows:5 }; }
  getCardSize() { return 6; }

  static styles = css`
    :host { display:block; width:100%; min-width:0; color:var(--primary-text-color); container-type:inline-size; }
    ic-glass-container { --glass-container-height:auto; --glass-container-padding:0; }
    .content-shell { padding:clamp(28px,3vw,var(--en-space-xl,32px)); }
    .card-content { display:grid; min-width:0; }
    .region { min-width:0; padding:28px 0; border-top:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); }

    .hero { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:14px; padding-bottom:24px; }
    .hero-copy { min-width:0; }
    .hero-title { overflow:hidden; color:var(--en-heading-primary,var(--primary-text-color)); font-size:var(--en-title-lg-size,24px); font-weight:var(--en-title-lg-weight,600); line-height:var(--en-title-lg-line-height,1.2); letter-spacing:var(--en-title-lg-letter-spacing,-.3px); text-overflow:ellipsis; white-space:nowrap; }
    .hero-description { margin-top:4px; color:var(--secondary-text-color); font-size:var(--en-helper-size,13px); line-height:var(--en-helper-line-height,1.3); }
    .hero-actions { display:flex; align-items:center; gap:8px; }
    .icon-circle { --icon-color:var(--en-color-primary); display:grid; width:38px; height:38px; flex:0 0 38px; place-items:center; border-radius:50%; background:color-mix(in srgb,var(--icon-color) 13%,transparent); color:var(--icon-color); }
    .icon-circle ha-icon { width:19px; height:19px; }
    .icon-circle.solar,.icon-circle.temperature { --icon-color:var(--en-color-accent); }
    .icon-circle.power,.icon-circle.execution { --icon-color:var(--en-color-success); }
    .icon-circle.time,.icon-circle.override { --icon-color:var(--en-color-primary); }
    .icon-circle.neutral { --icon-color:var(--secondary-text-color); }

    .status-pill { display:inline-flex; height:32px; box-sizing:border-box; align-items:center; gap:8px; padding:0 13px; border:var(--en-border-control); border-radius:var(--en-control-radius,999px); background:var(--en-surface-control); color:var(--primary-text-color); font-size:var(--en-helper-size,13px); font-weight:650; white-space:nowrap; }
    .status-dot { width:7px; height:7px; border-radius:50%; background:var(--secondary-text-color); }
    .status-pill.running .status-dot,.status-pill.completed .status-dot { background:var(--en-color-success); }
    .status-pill.waiting .status-dot,.status-pill.paused .status-dot { background:var(--en-color-accent); }
    .status-pill.scheduled .status-dot { background:#64a8ff; }
    .status-pill.blocked .status-dot { background:var(--error-color,#ff3b30); }
    .status-pill.unknown,.status-pill.disabled { background:color-mix(in srgb,var(--secondary-text-color) 8%,transparent); color:var(--secondary-text-color); }
    .status-pill.manual { color:var(--en-color-primary); }
    .status-pill.manual .status-dot { background:var(--en-color-primary); }

    .summary { display:flex; width:max-content; max-width:100%; flex-wrap:wrap; align-items:stretch; padding:0; }
    .summary-item { display:grid; grid-template-columns:38px minmax(0,1fr); min-width:150px; flex:0 1 auto; align-items:center; gap:10px; padding:0 18px; }
    .summary-item:first-child { padding-left:0; }
    .summary-item + .summary-item { border-left:1px solid color-mix(in srgb,var(--primary-text-color) 9%,transparent); }
    .summary-value { overflow:hidden; color:var(--primary-text-color); font-size:var(--en-title-md-size,18px); font-weight:var(--en-title-md-weight,600); line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
    .label { margin-top:3px; color:var(--secondary-text-color); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:1.3; }

    .live-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .live-column { display:grid; gap:18px; min-width:0; }
    .live-column:first-child { padding-right:clamp(24px,4vw,48px); }
    .live-column + .live-column { padding-left:clamp(24px,4vw,48px); border-left:1px solid color-mix(in srgb,var(--primary-text-color) 9%,transparent); }
    .data-row { display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:12px; min-width:0; }
    .data-copy { min-width:0; }
    .data-label { color:var(--secondary-text-color); font-size:var(--en-label-font-size,14px); font-weight:var(--en-label-font-weight,600); line-height:1.2; }
    .data-value { margin-top:4px; overflow:hidden; color:var(--primary-text-color); font-size:var(--en-title-md-size,18px); font-weight:var(--en-data-weight,700); line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
    .data-support { margin-top:3px; color:var(--secondary-text-color); font-size:var(--en-helper-size,13px); line-height:1.3; }
    ic-metric-value { display:block; margin-top:4px; --metric-value-size:var(--en-title-md-size,18px); --metric-value-letter-spacing:-.1px; --metric-unit-size:13px; --metric-unit-gap:4px; }
    ha-switch { flex:0 0 auto; --switch-checked-color:var(--en-color-primary); --switch-unchecked-button-color:var(--secondary-text-color); }

    .action-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .action-row ic-button { width:100%; --ic-button-width:100%; --ic-button-height:58px; --en-control-height-compact:58px; --en-control-padding-inline-compact:14px; }
    .action-row ic-button[variant="primary"] { --ic-action-background:var(--en-color-primary); }
    .action-row ic-button.pause { --ic-action-background:color-mix(in srgb,var(--en-color-accent) 10%,var(--en-surface-control)); }
    .action-row ic-button[variant="destructive"] { --ic-action-background:color-mix(in srgb,var(--error-color,#ff3b30) 8%,var(--en-surface-control)); }
    .action-icon { display:grid; width:28px; height:28px; flex:0 0 28px; place-items:center; border-radius:50%; background:color-mix(in srgb,currentColor 12%,transparent); }
    .action-icon ha-icon { width:16px; height:16px; }
    .action-copy { display:grid; min-width:0; gap:2px; text-align:left; }
    .action-label { font-size:14px; font-weight:650; line-height:1.15; }
    .action-support { overflow:hidden; font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); opacity:.68; text-overflow:ellipsis; white-space:nowrap; }

    .explanation-surface { padding:20px; border-radius:var(--en-panel-radius,18px); background:color-mix(in srgb,var(--en-color-primary) 4%,var(--en-surface-secondary,transparent)); }
    .explanation-surface.running,.explanation-surface.completed { background:color-mix(in srgb,var(--en-color-success) 5%,var(--en-surface-secondary,transparent)); }
    .explanation-surface.waiting,.explanation-surface.paused { background:color-mix(in srgb,var(--en-color-accent) 6%,var(--en-surface-secondary,transparent)); }
    .explanation-surface.scheduled { background:color-mix(in srgb,#64a8ff 6%,var(--en-surface-secondary,transparent)); }
    .explanation-surface.blocked { background:color-mix(in srgb,var(--error-color,#ff3b30) 5%,var(--en-surface-secondary,transparent)); }
    .explanation-lead { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:baseline; gap:12px; }
    .explanation-state { color:var(--primary-text-color); font-size:var(--en-title-md-size,18px); font-weight:600; }
    .explanation-state.running,.explanation-state.completed { color:var(--en-color-success); }
    .explanation-state.waiting,.explanation-state.paused { color:var(--en-color-accent); }
    .explanation-state.scheduled { color:#64a8ff; }
    .explanation-state.blocked { color:var(--error-color,#ff3b30); }
    .explanation-reason { color:var(--secondary-text-color); font-size:14px; line-height:1.45; }
    .explanation-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:28px; margin-top:20px; padding-top:20px; border-top:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); }
    .explanation-item { display:grid; grid-template-columns:32px minmax(0,1fr); gap:10px; }
    .explanation-item .icon-circle { width:32px; height:32px; flex-basis:32px; }
    .explanation-item .icon-circle ha-icon { width:16px; height:16px; }
    .explanation-value { margin-top:4px; overflow-wrap:anywhere; color:var(--primary-text-color); font-size:14px; font-weight:560; line-height:1.4; }
    .activity-time { color:var(--secondary-text-color); font-variant-numeric:tabular-nums; }
    .error { margin-top:16px; padding:10px 13px; border-radius:var(--en-radius-control,16px); background:color-mix(in srgb,var(--error-color,#ff453a) 8%,transparent); color:var(--error-color,#ff453a); font-size:12px; }

    /* Automation card layout: five aligned visual regions on one surface. */
    .hero { margin:calc(-1 * clamp(28px,3vw,var(--en-space-xl,32px))) calc(-1 * clamp(28px,3vw,var(--en-space-xl,32px))) 0; padding:20px clamp(28px,3vw,var(--en-space-xl,32px)); border-bottom:1px solid color-mix(in srgb,var(--primary-text-color) 9%,transparent); border-radius:var(--ic-radius-card) var(--ic-radius-card) 0 0; background:color-mix(in srgb,var(--en-color-primary) 3%,var(--en-surface-secondary,transparent)); }
    .region { display:grid; gap:14px; padding:24px 0; }
    .section-title { color:var(--en-heading-primary,var(--primary-text-color)); font-size:var(--en-title-md-size,18px); font-weight:var(--en-title-md-weight,600); line-height:var(--en-title-md-line-height,1.25); letter-spacing:var(--en-title-md-letter-spacing,-.1px); }
    .card-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
    .info-card { display:grid; grid-template-columns:38px minmax(0,1fr); min-width:0; min-height:92px; box-sizing:border-box; align-items:center; gap:12px; padding:16px; border:var(--en-border-control); border-radius:var(--en-panel-radius,18px); background:var(--en-surface-secondary,rgba(255,255,255,.06)); }
    .info-card-copy { min-width:0; }
    .info-card .data-label { margin:0; }
    .info-card .data-value { margin-top:5px; }
    .live-stack { display:grid; gap:12px; }
    .live-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .live-row .info-card { min-height:104px; }
    .control-card { grid-template-columns:38px minmax(0,1fr) auto; }
    .action-section { display:grid; gap:14px; }
    .action-row { padding:0; border:0; }
    .action-row ic-button { --ic-border-control:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent); }
    .explanation-surface { display:grid; gap:0; padding:0; overflow:hidden; border:var(--en-border-control); }
    .explanation-layout { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .explanation-cell { min-width:0; padding:17px 18px; }
    .explanation-cell:nth-child(even) { border-left:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); }
    .explanation-cell:nth-child(n+3) { border-top:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); }

    @container (max-width:620px) {
      .content-shell { padding:20px; }
      .hero { grid-template-columns:auto minmax(0,1fr) auto; margin:-20px -20px 0; padding:18px 20px; }
      .hero-actions { grid-column:auto; justify-content:flex-end; margin-top:0; }
      .status-pill { max-width:132px; overflow:hidden; text-overflow:ellipsis; }
      .region { padding:24px 0; }
      .card-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .card-grid .info-card:last-child { grid-column:1 / -1; }
      .live-grid { grid-template-columns:1fr; gap:18px; }
      .live-column:first-child,.live-column + .live-column { padding:0; border:0; }
      .live-row { grid-template-columns:1fr; }
      .action-row { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .action-row ic-button:last-child { grid-column:1 / -1; }
      .explanation-lead { grid-template-columns:1fr; gap:6px; }
      .explanation-grid { grid-template-columns:1fr; gap:18px; }
      .explanation-layout { grid-template-columns:1fr; }
      .explanation-cell:nth-child(even) { border-left:0; }
      .explanation-cell + .explanation-cell { border-top:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); }
    }
    @container (max-width:380px) {
      .content-shell { padding:18px; }
      .hero { margin:-18px -18px 0; padding:16px 18px; gap:10px; }
      .status-pill { max-width:112px; padding-inline:10px; }
      .summary-item { min-width:100%; padding:0; border-left:0 !important; }
      .data-row { grid-template-columns:34px minmax(0,1fr) auto; gap:10px; }
      .icon-circle { width:34px; height:34px; flex-basis:34px; }
    }
    @media (prefers-reduced-motion:reduce) { * { transition:none !important; } }
  `;

  private defaultAction(key: ScenarioActionKey): AutomationServiceAction {
    return { domain:"homeassistant", service:key === "run_now" ? "turn_on" : "turn_off", entity_id:this.config?.device_entity };
  }

  private async callAction(key: ScenarioActionKey) {
    if (!this._hass || !this.config || this.actionPending) return;
    const action = this.config.actions?.[key] ?? this.defaultAction(key);
    const domain = action.domain?.trim() || "homeassistant";
    const service = action.service?.trim() || (key === "run_now" ? "turn_on" : "turn_off");
    const entityId = action.entity_id?.trim() || this.config.device_entity;
    this.actionPending = key;
    this.actionError = "";
    try {
      await this._hass.callService(domain, service, { ...action.data, ...(entityId ? { entity_id:entityId } : {}) });
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : "Unable to perform action";
    } finally { this.actionPending = undefined; }
  }

  private waitForEntityState(entityId: string, expected: "on" | "off"): Promise<void> {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const state = this._hass?.states[entityId]?.state;
        if (state === expected) resolve();
        else if (Date.now() - started >= 5000) reject(new Error("Home Assistant did not confirm the new state"));
        else window.setTimeout(check, 150);
      };
      check();
    });
  }

  private async toggleEntity(entityId: string, pendingKey: "manual_override" | "device", current: boolean) {
    if (!this._hass || this.actionPending) return;
    const expected = current ? "off" : "on";
    this.actionPending = pendingKey;
    this.actionError = "";
    try {
      await this._hass.callService("homeassistant", current ? "turn_off" : "turn_on", { entity_id:entityId });
      await this.waitForEntityState(entityId, expected);
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : "Unable to update entity";
    } finally { this.actionPending = undefined; }
  }

  private toggleManualOverride() {
    if (!this.config) return;
    const current = this._hass?.states[this.config.manual_override_entity]?.state === "on";
    void this.toggleEntity(this.config.manual_override_entity, "manual_override", current);
  }

  private toggleDevice() {
    if (!this.config) return;
    const current = this._hass?.states[this.config.device_entity]?.state === "on";
    void this.toggleEntity(this.config.device_entity, "device", current);
  }

  private openDetails() {
    if (!this.config) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail:{ entityId:this.config.automation_entity || this.config.status_entity }, bubbles:true, composed:true,
    }));
  }

  private renderIcon(icon: string, tone: string) {
    return html`<span class="icon-circle ${tone}"><ha-icon .icon=${icon}></ha-icon></span>`;
  }

  private renderAction(key: ScenarioActionKey, label: string, supporting: string, icon: string, variant: "primary" | "secondary" | "destructive" = "secondary") {
    const pending = this.actionPending === key;
    return html`<ic-button class=${key === "pause" ? "pause" : ""} .variant=${variant} .disabled=${Boolean(this.actionPending)} @click=${() => this.callAction(key)}>
      <span class="action-icon"><ha-icon .icon=${pending ? "mdi:loading" : icon}></ha-icon></span>
      <span class="action-copy"><span class="action-label">${pending ? "Working…" : label}</span><span class="action-support">${supporting}</span></span>
    </ic-button>`;
  }

  render() {
    if (!this.config) return nothing;
    const scenario = resolveAutomationScenario(this._hass, this.config);
    const show = { power:true, temperature:true, strategy:true, device:true, next_action:true, last_action:true, ...this.config.show };
    const labels = {
      current_device:"Current Device", target_time:"Target Time", heating_strategy:"Heating Strategy",
      water_temperature:"Water Temperature", current_power:"Current Power", device_status:"Device Status",
      manual_override:"Manual Override", ...this.config.labels,
    };
    const targetTemperature = scenario.targetTemperatureValue
      ? `${scenario.targetTemperatureValue}${scenario.temperatureUnit}` : "";
    const showNextAction = show.next_action && scenario.nextActionAvailable;
    const showLastAction = show.last_action && scenario.lastActionAvailable;
    const nextAction = scenario.estimatedFinish !== "Not available"
      ? `Expected to finish at ${scenario.estimatedFinish}.`
      : `The system will work toward the ${scenario.targetTime} target.`;

    return html`<ic-glass-container><div class="content-shell"><article class="card-content" aria-label=${scenario.title}>
      <header class="hero">
        ${this.renderIcon(scenario.icon, "solar")}
        <div class="hero-copy"><div class="hero-title">${scenario.title}</div></div>
        <div class="hero-actions">
          <span class="status-pill ${scenario.manualOverride ? "manual" : scenario.status.status}"><span class="status-dot"></span>${scenario.manualOverride ? "Manual Override" : scenario.status.status === "running" ? "Automation Active" : scenario.status.label}</span>
          <ic-action-button icon="mdi:dots-horizontal" label="Automation details" @action-click=${this.openDetails}></ic-action-button>
        </div>
      </header>

      <section class="region" aria-label="Current strategy">
        <div class="section-title">Current Strategy</div>
        <div class="card-grid">
          <div class="info-card">${this.renderIcon("mdi:heat-pump","execution")}<div class="info-card-copy"><div class="data-label">${labels.current_device}</div><div class="data-value">${scenario.deviceAvailable && scenario.deviceName ? scenario.deviceName : "Unavailable"}</div></div></div>
          <div class="info-card">${this.renderIcon("mdi:clock-outline","time")}<div class="info-card-copy"><div class="data-label">${labels.target_time}</div><div class="data-value">${scenario.targetAvailable ? scenario.targetTime : "--"}</div></div></div>
          <div class="info-card">${this.renderIcon(scenario.strategyAvailable ? scenario.strategy.icon : "mdi:tune-variant","solar")}<div class="info-card-copy"><div class="data-label">${labels.heating_strategy}</div><div class="data-value">${scenario.strategyAvailable ? scenario.strategy.label : "Unavailable"}</div></div></div>
        </div>
      </section>

      <section class="region" aria-label="Live status">
        <div class="section-title">Live Status</div>
        <div class="live-stack">
          <div class="live-row">
            ${show.temperature ? html`<div class="info-card">${this.renderIcon("mdi:thermometer","temperature")}<div class="info-card-copy"><div class="data-label">${labels.water_temperature}</div><div class="data-value">${scenario.temperatureValue}${scenario.temperatureValue === "--" ? "" : scenario.temperatureUnit}</div><div class="data-support">${targetTemperature ? `Target ${targetTemperature}` : scenario.temperatureValue === "--" ? "Sensor unavailable" : "Current sensor reading"}</div></div></div>` : nothing}
            ${show.power ? html`<div class="info-card">${this.renderIcon("mdi:flash","power")}<div class="info-card-copy"><div class="data-label">${labels.current_power}</div><ic-metric-value .value=${scenario.powerValue} .unit=${scenario.powerUnit} .status=${scenario.powerValue === "--" ? "unavailable" : "valid"}></ic-metric-value><div class="data-support">${scenario.powerValue === "--" ? "Sensor unavailable" : "Real-time power usage"}</div></div></div>` : nothing}
          </div>
          <div class="live-row">
            ${show.device ? html`<div class="info-card control-card">${this.renderIcon("mdi:power","execution")}<div class="info-card-copy"><div class="data-label">${labels.device_status}</div><div class="data-value">${scenario.deviceStateLabel}</div><div class="data-support">${scenario.deviceAvailable ? scenario.deviceOn ? "Running" : "Not running" : "Waiting for Home Assistant"}</div></div><ha-switch .checked=${scenario.deviceOn} .disabled=${Boolean(this.actionPending) || !scenario.deviceAvailable} aria-label=${labels.device_status} @change=${this.toggleDevice}></ha-switch></div>` : nothing}
            <div class="info-card control-card">${this.renderIcon("mdi:hand-back-right-outline","override")}<div class="info-card-copy"><div class="data-label">${labels.manual_override}</div><div class="data-value">${scenario.manualOverrideAvailable ? scenario.manualOverride ? "On" : "Off" : "Unavailable"}</div><div class="data-support">${scenario.manualOverrideAvailable ? scenario.manualOverride ? "User control enabled" : "Following automation" : "Waiting for Home Assistant"}</div></div><ha-switch .checked=${scenario.manualOverride} .disabled=${Boolean(this.actionPending) || !scenario.manualOverrideAvailable} aria-label=${labels.manual_override} @change=${this.toggleManualOverride}></ha-switch></div>
          </div>
        </div>
      </section>

      <section class="region action-section" aria-label="Automation controls">
        <div class="section-title">Automation Control</div>
        <div class="action-row">
          ${this.renderAction("run_now","Run Now","Start immediately","mdi:play","primary")}
          ${this.renderAction("pause","Pause","Pause automation","mdi:pause")}
          ${this.renderAction("stop","Stop","Stop current run","mdi:stop","destructive")}
        </div>
      </section>

      <section class="region" aria-label="Automation explanation">
        <div class="section-title">Automation Explanation</div>
        <div class="explanation-surface ${scenario.status.status}">
          <div class="explanation-layout">
            <div class="explanation-cell"><div class="data-label">Status</div><div class="explanation-value explanation-state ${scenario.status.status}">${scenario.status.label}</div></div>
            <div class="explanation-cell"><div class="data-label">Reason</div><div class="explanation-value">${scenario.reason}</div></div>
            <div class="explanation-cell"><div class="data-label">Next Action</div><div class="explanation-value">${showNextAction ? nextAction : "--"}</div></div>
            <div class="explanation-cell"><div class="data-label">Last Action</div><div class="explanation-value">${showLastAction ? html`${scenario.lastActionTime ? html`<span class="activity-time">${scenario.lastActionTime} · </span>` : nothing}${scenario.lastAction}` : "--"}</div></div>
          </div>
        </div>
      </section>
      ${this.actionError ? html`<div class="error" role="alert">${this.actionError}</div>` : nothing}
    </article></div></ic-glass-container>`;
  }
}

customElements.define("energy-automation-card", EnergyAutomationCard);
