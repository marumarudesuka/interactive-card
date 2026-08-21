import { LitElement, css, html, type TemplateResult } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import {
  getCircuitDiscoveryCandidates,
  getKpiDiscoveryCandidates,
  getTrendDiscoveryCandidates,
} from "../../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type {
  SetupCircuitItem,
  SetupDraft,
  SetupKpiItem,
  SetupSection,
  SetupTrendItem,
} from "../../setup/setup.types";
import type { DiscoveryEntitySelectedDetail } from "../../editors/shared/discovery-entity-picker.ts";
import "../../editors/shared/discovery-entity-picker.ts";

type SetupItem = SetupKpiItem | SetupTrendItem | SetupCircuitItem;
const kpiTemplateIds:Record<SetupKpiItem["kind"],string> = {
  current_power:"power", daily_energy:"usage", total_energy:"total_usage",
  cost:"cost", solar:"solar_generation",
};

export class SetupDashboardSelection extends LitElement {
  static properties = {
    hass:{ attribute:false }, draft:{ attribute:false }, metrics:{ attribute:false },
  };
  hass?:HomeAssistant;
  draft?:SetupDraft;
  metrics:readonly DiscoveredMetric[] = [];
  static styles = css`
    :host{display:block}.sections{display:grid;gap:20px}.list{display:grid;gap:8px}
    .item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:12px;border:1px solid var(--divider-color);border-radius:12px}
    .fields{display:grid;gap:8px;min-width:0}.actions{display:flex}.technical{color:var(--secondary-text-color);font-size:12px;overflow-wrap:anywhere}
    discovery-entity-picker,ha-textfield{display:block;width:100%}
  `;

  private emit(name:string, detail:unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles:true, composed:true }));
  }

  private candidates(section:SetupSection, item:SetupItem):readonly DiscoveredMetric[] {
    if (section === "circuits") return getCircuitDiscoveryCandidates(this.metrics, item.entityId);
    if (section === "trend") return getTrendDiscoveryCandidates(this.metrics, item.entityId);
    const kpi = item as SetupKpiItem;
    return getKpiDiscoveryCandidates(this.metrics, kpiTemplateIds[kpi.kind], item.entityId);
  }

  private renderSection(
    title:string,
    section:SetupSection,
    items:readonly SetupItem[]
  ):TemplateResult {
    return html`<section><h3>${title}</h3>
      ${items.length ? html`<div class="list">${items
        .slice().sort((a, b) => a.order - b.order).map((item, index) => html`
        <div class="item">
          <ha-switch .checked=${item.enabled}
            @change=${() => this.emit("setup-item-toggle", { section, order:item.order })}>
          </ha-switch>
          <div class="fields">
            <ha-textfield label="Display label" .value=${item.displayName}
              @input=${(event:Event) => this.emit("setup-item-update", {
                section, order:item.order,
                changes:{ displayName:(event.target as HTMLInputElement).value },
              })}></ha-textfield>
            <discovery-entity-picker label="Energy entity" .hass=${this.hass}
              .value=${item.entityId} .candidates=${this.candidates(section, item)}
              @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) => {
                const metric = this.metrics.find(
                  (candidate) => candidate.entityId === event.detail.entityId
                );
                this.emit("setup-item-update", {
                  section, order:item.order,
                  changes:{
                    entityId:event.detail.entityId,
                    displayName:metric?.name ?? item.displayName,
                  },
                });
              }}></discovery-entity-picker>
            <span class="technical">${item.entityId}</span>
            <details><summary>Why this was suggested</summary>
              <p>${item.source.reason}</p>
              <p>Confidence: ${Math.round(item.source.confidence * 100)}%</p>
            </details>
          </div>
          <div class="actions">
            <ha-button appearance="plain" ?disabled=${index === 0}
              @click=${() => this.emit("setup-item-move", {
                section, order:item.order, direction:-1,
              })}>Up</ha-button>
            <ha-button appearance="plain" ?disabled=${index === items.length - 1}
              @click=${() => this.emit("setup-item-move", {
                section, order:item.order, direction:1,
              })}>Down</ha-button>
          </div>
        </div>`)}
      </div>` : html`<p>No compatible recommendations found. You can continue without this section.</p>`}
    </section>`;
  }

  render() {
    if (!this.draft) return html``;
    return html`<h2>Dashboard Preview</h2>
      <p>Choose what should be included. You can change this later.</p>
      <div class="sections">
        ${this.renderSection("Energy Overview", "kpis", this.draft.kpis)}
        ${this.renderSection("Energy Trend", "trend", this.draft.trend)}
        ${this.renderSection("Active Circuits", "circuits", this.draft.circuits)}
      </div>`;
  }
}
if (!customElements.get("setup-dashboard-selection")) {
  customElements.define("setup-dashboard-selection", SetupDashboardSelection);
}
