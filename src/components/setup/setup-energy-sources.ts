import { LitElement, css, html } from "lit";
import type { DashboardRecommendationPreview } from "../../recommendation/recommendation.types";

export class SetupEnergySources extends LitElement {
  static properties = { preview:{ attribute:false } };
  preview?:DashboardRecommendationPreview;
  static styles = css`
    :host{display:block}.summary{display:grid;gap:10px}.item{display:flex;gap:10px;align-items:center}
    ha-icon{color:var(--primary-color)}.optional{color:var(--secondary-text-color)}
  `;
  render() {
    if (!this.preview) return html``;
    const has = (kind:string) => this.preview?.kpis.some((item) => item.kind === kind);
    const items = [
      ["Main power", has("current_power")],
      ["Energy usage", has("daily_energy") || has("total_energy")],
      ["Cost", has("cost")],
      ["Solar", has("solar")],
      ["Possible circuits", Boolean(this.preview.circuits.length)],
    ] as const;
    return html`
      <h2>Energy Sources</h2>
      <p>Enecess reviewed your Home Assistant energy entities.</p>
      <div class="summary">
        ${items.map(([label, found]) => html`
          <div class="item ${found ? "" : "optional"}">
            <ha-icon icon=${found ? "mdi:check-circle" : "mdi:minus-circle-outline"}></ha-icon>
            <span>${label}${found ? " found" : " not found (optional)"}</span>
          </div>
        `)}
      </div>
      <p>${this.preview.availableMetricCount} available metrics found.</p>
    `;
  }
}
if (!customElements.get("setup-energy-sources")) {
  customElements.define("setup-energy-sources", SetupEnergySources);
}
