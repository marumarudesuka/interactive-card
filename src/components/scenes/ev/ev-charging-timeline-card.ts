import { LitElement, html } from "lit";
import type { SceneChartSeries } from "../../../types/scenes";
import "../common/scene-chart-card";

export class EvChargingTimelineCard extends LitElement {
  static properties = { series: { attribute:false } };
  series: SceneChartSeries[] = [];
  render() {
    return html`<ic-scene-chart-card
      title="Charging Timeline"
      subtitle="18:00 → 02:00 · optimized charging window"
      .series=${this.series}
    ></ic-scene-chart-card>`;
  }
}
customElements.define("ev-charging-timeline-card", EvChargingTimelineCard);
