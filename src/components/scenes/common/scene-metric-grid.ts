import { LitElement, css, html } from "lit";

import type { SceneMetric } from "../../../types/scenes";
import "../../common/ic-card-container";
import "../../common/metric-value";

export class SceneMetricGrid extends LitElement {
  static properties = { metrics: { attribute: false } };
  metrics: SceneMetric[] = [];

  static styles = css`
    :host { display:block; width:100%; min-width:0; container-type:inline-size; }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
    ic-card-container { --energy-card-height:140px; --energy-card-padding:18px; }
    .metric { display:grid; height:100%; grid-template-columns:1fr auto; gap:10px; }
    .title { color:var(--en-subtitle-secondary,var(--secondary-text-color)); font-size:13px; font-weight:600; }
    ic-metric-value { align-self:end; --metric-value-size:30px; --metric-unit-size:13px; }
    ha-icon { opacity:.45; --mdc-icon-size:24px; }
    @container (max-width:900px) { .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  `;

  render() {
    return html`<div class="grid">${this.metrics.map((metric) => html`
      <ic-card-container>
        <div class="metric">
          <div class="title">${metric.title}</div>
          <ha-icon .icon=${metric.icon ?? "mdi:chart-box-outline"}></ha-icon>
          <ic-metric-value
            .value=${String(metric.value)}
            .unit=${metric.unit ?? ""}
            status="valid"
          ></ic-metric-value>
        </div>
      </ic-card-container>`)}
    </div>`;
  }
}

customElements.define("ic-scene-metric-grid", SceneMetricGrid);
