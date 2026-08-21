import { LitElement, css, html } from "lit";
import type { AutomationStrategyPresentation } from "../../types/automation-scenario";

export class AutomationStrategyBadge extends LitElement {
  static properties = { presentation:{ attribute:false } };
  presentation: AutomationStrategyPresentation = {
    label:"Not set", icon:"mdi:tune-variant", tone:"neutral",
  };

  static styles = css`
    :host { display:inline-flex; --strategy-color:var(--secondary-text-color); }
    :host([tone="solar"]) { --strategy-color:var(--en-color-accent); }
    :host([tone="grid"]) { --strategy-color:#64a8ff; }
    :host([tone="wait"]) { --strategy-color:var(--en-color-accent); }
    .badge { display:inline-flex; height:34px; box-sizing:border-box; align-items:center; gap:7px; padding:0 13px; border:1px solid color-mix(in srgb,var(--strategy-color) 38%,transparent); border-radius:999px; background:color-mix(in srgb,var(--strategy-color) 12%,var(--en-surface-control,transparent)); color:var(--strategy-color); backdrop-filter:var(--en-blur-control,blur(12px)); font-size:13px; font-weight:650; }
    ha-icon { width:17px; height:17px; }
  `;
  protected willUpdate() { this.setAttribute("tone", this.presentation.tone); }
  render() { return html`<span class="badge"><ha-icon .icon=${this.presentation.icon}></ha-icon>${this.presentation.label}</span>`; }
}

customElements.define("ic-automation-strategy-badge", AutomationStrategyBadge);
