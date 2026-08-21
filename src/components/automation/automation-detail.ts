import { LitElement, css, html, nothing } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { AutomationActionExecutor } from "../../automation/automation-action-executor.ts";
import { getPresentedAutomationQuickActions } from "../../automation/automation-runtime-ui.ts";
import { openAutomationEditorOrMoreInfo } from "../../automation/native-automation-editor-launcher.ts";
import type { NormalizedScenarioAction, ResolvedLinkedAutomation, ScenarioActionConfig } from "../../automation/automation-scenario.types.ts";
import "../common/button.ts";

export class AutomationDetail extends LitElement {
  static properties = { hass:{ attribute:false }, automation:{ attribute:false }, actions:{ attribute:false }, excludedEntityIds:{ attribute:false }, actionsOnly:{ type:Boolean, attribute:"actions-only" }, hideActions:{ type:Boolean, attribute:"hide-actions" }, hideEdit:{ type:Boolean, attribute:"hide-edit" }, compact:{ type:Boolean, reflect:true }, error:{ state:true } };
  hass?:HomeAssistant;
  automation?:ResolvedLinkedAutomation;
  actions?:NormalizedScenarioAction[];
  excludedEntityIds:string[] = [];
  actionsOnly = false;
  hideActions = false;
  hideEdit = false;
  compact = false;
  private readonly executor = new AutomationActionExecutor();
  private error = "";

  static styles = css`
    :host { display:block; min-width:0; container-type:inline-size; }
    .detail { display:grid; gap:12px; padding-top:12px; border-top:1px solid color-mix(in srgb,var(--en-text-secondary,var(--secondary-text-color)) 18%,transparent); }
    .detail.actions-only { padding-top:0; border-top:0; }
    .action-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 16px; }
    .actions { display:flex; flex-wrap:wrap; gap:var(--en-control-gap,8px); }
    .link { border:0; border-radius:var(--ic-radius-control,var(--en-radius-control,12px)); padding:4px 6px; background:transparent; color:var(--en-color-primary); cursor:pointer; font:inherit; font-size:var(--en-helper-size,13px); font-weight:600; }
    .link:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .error { color:var(--error-color); font-size:var(--en-helper-size,13px); }
    :host([compact]) .action-footer { justify-content:flex-end; }
    :host([compact]) .actions { gap:6px; }
    :host([compact]) ic-button { --en-control-height-compact:32px; --en-control-padding-inline-compact:12px; }
  `;

  private async run(action:ScenarioActionConfig) {
    if (!this.hass) return;
    this.error = ""; this.requestUpdate();
    const result = await this.executor.execute(this.hass,action,{ confirm:() => window.confirm(`Run ${action.label}?`) });
    if (result.status === "error") this.error = result.error;
    this.requestUpdate();
  }

  render() {
    const automation = this.automation;
    if (!automation && !this.actionsOnly) return nothing;
    if (this.hideActions && this.hideEdit && !this.error) return nothing;
    const actions = this.actions ?? (automation ? getPresentedAutomationQuickActions(automation) : []);
    return html`<section class="detail ${this.actionsOnly?"actions-only":""}">
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
      <div class="action-footer">${this.hideActions?nothing:html`<div class="actions">${actions.map((action) => html`<ic-button .variant=${this.compact ? "compact" : action.tone === "destructive" ? "destructive" : action.tone === "primary" ? "primary" : "secondary"} .disabled=${!action.available} .loading=${this.executor.isPending(action.id)} @click=${() => this.run(action)}>${action.label}</ic-button>`)}</div>`}${this.actionsOnly||!automation||this.hideEdit?nothing:html`<button class="link" type="button" @click=${() => openAutomationEditorOrMoreInfo(this,automation)}>Edit in HA →</button>`}</div>
    </section>`;
  }
}
customElements.define("automation-detail",AutomationDetail);
