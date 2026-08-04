import { LitElement, css, html } from "lit";
import type { SceneInsight } from "../../../types/scenes";
import "../../common/glass-container";

export class SceneInsightCard extends LitElement {
  static properties = { insight: { attribute: false } };
  insight?: SceneInsight;
  static styles = css`
    :host { display:block; min-width:0; }
    ic-glass-container { --glass-container-height:auto; --glass-container-padding:18px; }
    .insight { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:14px; }
    .icon { display:grid; width:38px; height:38px; place-items:center; border-radius:50%; background:var(--en-color-primary-soft); color:var(--en-color-primary); }
    .warning .icon { background:var(--en-color-accent-soft); color:var(--en-color-accent); }
    .success .icon,.achievement .icon { background:var(--en-color-success-soft); color:var(--en-color-success); }
    h3 {
      margin:0 0 4px;
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    h3 { color:var(--en-heading-primary,var(--primary-text-color)); }
    p { margin:0; color:var(--en-body-secondary,var(--secondary-text-color)); font-size:13px; }
  `;
  render() {
    if (!this.insight) return null;
    return html`<ic-glass-container><div class="insight ${this.insight.severity}">
      <div class="icon"><ha-icon .icon=${this.insight.icon ?? "mdi:lightbulb-on-outline"}></ha-icon></div>
      <div><h3>${this.insight.title}</h3><p>${this.insight.description}</p></div>
    </div></ic-glass-container>`;
  }
}
customElements.define("ic-scene-insight-card", SceneInsightCard);
export class EnergyInsightCard extends SceneInsightCard {}
customElements.define("energy-insight-card", EnergyInsightCard);
