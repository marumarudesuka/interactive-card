import { LitElement, css, html } from "lit";
import type { SceneMetric } from "../../../types/scenes";
import "../../common/glass-container";

export class SceneStatusCard extends LitElement {
  static properties = {
    title: { type: String },
    description: { type: String },
    metrics: { attribute: false },
  };
  title = "";
  description = "";
  metrics: SceneMetric[] = [];

  static styles = css`
    :host { display:block; min-width:0; }
    ic-glass-container { --glass-container-height:auto; }
    h3 {
      margin:0 0 6px;
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    h3 { color:var(--en-heading-primary,var(--primary-text-color)); }
    p { margin:0 0 18px; color:var(--en-body-secondary,var(--secondary-text-color)); }
    .values { display:flex; flex-wrap:wrap; gap:24px; }
    .value span { color:var(--secondary-text-color); font-size:12px; }
    .value strong { display:block; margin-top:4px; font-size:21px; }
  `;
  render() {
    return html`<ic-glass-container><h3>${this.title}</h3>
      <p>${this.description}</p><div class="values">${this.metrics.map((m) => html`
        <div class="value"><span>${m.title}</span><strong>${m.value} ${m.unit ?? ""}</strong></div>
      `)}</div></ic-glass-container>`;
  }
}
customElements.define("ic-scene-status-card", SceneStatusCard);
