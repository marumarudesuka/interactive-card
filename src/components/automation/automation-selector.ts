import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { AutomationActionExecutor } from "../../automation/automation-action-executor.ts";
import type { ResolvedAutomationGroup } from "../../automation/automation-scenario.types.ts";
import type { ScenarioActionConfig } from "../../automation/automation-scenario.types.ts";
import "../common/action-button.ts";
import type { ToggleChangeDetail } from "../common/toggle.ts";
import "../common/toggle.ts";

export interface AutomationSelectionDetail { automationId:string; groupId:string; }

export class AutomationSelector extends LitElement {
  static properties = {
    hass:{ attribute:false }, groups:{ attribute:false },
    selectedId:{ type:String, attribute:"selected-id" },
    error:{ state:true }, pendingActionId:{ state:true },
  };
  groups:ResolvedAutomationGroup[] = [];
  hass?:HomeAssistant;
  selectedId = "";
  private readonly executor = new AutomationActionExecutor();
  private error = "";
  private pendingActionId = "";

  static styles = css`
    :host { display:block; min-width:0; container-type:inline-size; }
    .navigator { display:grid; max-height:240px; min-width:0; gap:4px; overflow-y:auto; padding-right:3px; scrollbar-width:thin; }
    .group { display:grid; min-width:0; gap:1px; padding-top:5px; border-top:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .group:first-child { padding-top:0; border-top:0; }
    .group-label { overflow:hidden; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); line-height:var(--en-helper-line-height,1.3); letter-spacing:0; text-overflow:ellipsis; white-space:nowrap; }
    .automation-list { display:grid; min-width:0; gap:2px; }
    .automation-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; min-width:0; min-height:40px; box-sizing:border-box; padding:2px 0; border-bottom:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .automation-row:last-child { border-bottom:0; }
    .copy { display:grid; min-width:0; gap:3px; border:0; padding:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
    .name-row { display:flex; max-width:100%; min-width:0; align-items:center; gap:8px; }
    .name { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:var(--en-body-size,14px); font-weight:500; line-height:var(--en-body-line-height,1.4); text-overflow:ellipsis; white-space:nowrap; }
    .automation-row.selected .name { color:var(--en-color-primary); }
    .enabled { display:flex; min-width:0; align-items:center; gap:8px; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-helper-size,13px); font-weight:var(--en-helper-weight,400); white-space:nowrap; }
    .error { color:var(--error-color); font-size:var(--en-helper-size,13px); }
    .empty { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:var(--en-body-size,14px); }
    .dot { width:7px; height:7px; flex:0 0 7px; border-radius:50%; background:var(--en-text-secondary,var(--secondary-text-color)); opacity:.55; }
    .dot.enabled { background:var(--en-color-success); opacity:1; }
    .dot.unavailable { background:var(--en-color-warning,var(--en-color-accent)); opacity:1; }
    @container (max-width:420px) { .automation-row { gap:8px; } .enabled > span { display:none; } }
  `;

  private async toggleEnabled(checked:boolean,automation:ResolvedAutomationGroup["automations"][number]) {
    if (!this.hass) return;
    const action:ScenarioActionConfig = { id:`${automation.id}-enabled`, label:checked ? "Enable" : "Disable", service:`automation.${checked ? "turn_on" : "turn_off"}`, target_entity:automation.entityId };
    this.error = "";
    this.pendingActionId = action.id;
    try {
      const result = await this.executor.execute(this.hass,action,{ confirm:() => window.confirm(`Run ${action.label}?`) });
      if (result.status === "error") this.error = result.error;
    } finally { this.pendingActionId = ""; }
  }

  private select(automationId:string,groupId:string) {
    this.error = "";
    this.dispatchEvent(new CustomEvent<AutomationSelectionDetail>("automation-selected", {
      detail:{ automationId,groupId }, bubbles:true, composed:true,
    }));
  }

  render() {
    if (!this.groups.length) return nothing;
    return html`<div class="navigator">
      ${this.groups.map(group=>html`<section class="group"><div class="group-label">${group.label}</div>${group.automations.length ? html`<div class="automation-list">${group.automations.map((automation) => {
        const toggleActionId=`${automation.id}-enabled`;
        return html`<div class="automation-row ${automation.id===this.selectedId?"selected":""}"><button class="copy" type="button" @click=${()=>this.select(automation.id,group.id)}><span class="name-row"><span class="dot ${!automation.available?"unavailable":automation.enabled?"enabled":""}"></span><span class="name">${automation.name}</span></span></button><div class="enabled"><span>${!automation.available?"Unavailable":automation.enabled?"Enabled":"Disabled"}</span><ic-toggle label=${`${automation.name} enabled`} .checked=${automation.enabled} .pending=${this.pendingActionId===toggleActionId||this.executor.isPending(toggleActionId)} .unavailable=${!automation.available||!automation.enabledAvailable} @toggle-change=${(event:CustomEvent<ToggleChangeDetail>)=>this.toggleEnabled(event.detail.checked,automation)}></ic-toggle></div></div>`;
      })}</div>` : html`<div class="empty">No automations linked to this group.</div>`}</section>`)}
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    </div>`;
  }
}
customElements.define("automation-selector",AutomationSelector);
