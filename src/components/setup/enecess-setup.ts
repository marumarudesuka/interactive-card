import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { discoverEnergyMetrics } from "../../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import { recommendDashboard } from "../../recommendation/dashboard-recommender.ts";
import type { DashboardRecommendationPreview } from "../../recommendation/recommendation.types";
import {
  createSetupCompleteDetail,
  createSetupDraft,
  moveSetupItem,
  toggleSetupItem,
  updateSetupItem,
} from "../../setup/setup-controller.ts";
import type { SetupDraft, SetupSection } from "../../setup/setup.types";
import "./setup-energy-sources.ts";
import "./setup-dashboard-selection.ts";
import "./setup-review.ts";
import "../common/button";

export class EnecessSetup extends LitElement {
  static properties = {
    hass:{ attribute:false }, step:{ state:true }, draft:{ state:true },
  };
  private _hass?:HomeAssistant;
  private metrics:readonly DiscoveredMetric[] = [];
  private preview?:DashboardRecommendationPreview;
  private draft?:SetupDraft;
  private step = 0;

  static styles = css`
    :host{display:block;color:var(--primary-text-color)}.setup{display:grid;gap:20px;max-width:760px;margin:0 auto;padding:20px}.progress{display:flex;gap:8px;color:var(--secondary-text-color)}.progress .active{color:var(--primary-color);font-weight:600}.footer{display:flex;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--divider-color)}
  `;

  set hass(hass:HomeAssistant | undefined) {
    this._hass = hass;
    if (hass && !this.draft) {
      this.metrics = discoverEnergyMetrics(hass);
      this.preview = recommendDashboard(this.metrics);
      this.draft = createSetupDraft(this.preview);
    }
    this.requestUpdate();
  }
  get hass() { return this._hass; }

  setRecommendations(
    preview:DashboardRecommendationPreview,
    metrics:readonly DiscoveredMetric[] = []
  ) {
    this.preview = preview;
    this.metrics = metrics;
    this.draft = createSetupDraft(preview);
    this.step = 0;
    this.requestUpdate();
  }

  private handleToggle(event:CustomEvent<{section:SetupSection; order:number}>) {
    event.stopPropagation();
    if (this.draft) this.draft = toggleSetupItem(
      this.draft, event.detail.section, event.detail.order
    );
  }

  private handleMove(event:CustomEvent<{
    section:SetupSection; order:number; direction:-1|1;
  }>) {
    event.stopPropagation();
    if (this.draft) this.draft = moveSetupItem(
      this.draft, event.detail.section, event.detail.order, event.detail.direction
    );
  }

  private handleUpdate(event:CustomEvent<{
    section:SetupSection; order:number;
    changes:{entityId?:string; displayName?:string};
  }>) {
    event.stopPropagation();
    if (this.draft) this.draft = updateSetupItem(
      this.draft, event.detail.section, event.detail.order, event.detail.changes
    );
  }

  private complete() {
    if (!this.draft) return;
    this.dispatchEvent(new CustomEvent("setup-complete", {
      detail:createSetupCompleteDetail(this.draft),
      bubbles:true,
      composed:true,
    }));
  }

  render() {
    if (!this.preview || !this.draft || !this.hass) {
      return html`<div class="setup"><p>Waiting for Home Assistant entities…</p></div>`;
    }
    return html`<div class="setup">
      <div class="progress" aria-label="Setup progress">
        ${["Sources", "Selection", "Review"].map((label, index) => html`
          <span class=${index === this.step ? "active" : ""}>${index + 1}. ${label}</span>
        `)}
      </div>
      ${this.step === 0 ? html`
        <setup-energy-sources .preview=${this.preview}></setup-energy-sources>
      ` : this.step === 1 ? html`
        <setup-dashboard-selection .hass=${this.hass} .draft=${this.draft}
          .metrics=${this.metrics}
          @setup-item-toggle=${this.handleToggle}
          @setup-item-move=${this.handleMove}
          @setup-item-update=${this.handleUpdate}>
        </setup-dashboard-selection>
      ` : html`<setup-review .draft=${this.draft}></setup-review>`}
      <div class="footer">
        <ic-button .disabled=${this.step === 0}
          @click=${() => { if (this.step > 0) this.step--; }}>Back</ic-button>
        ${this.step < 2
          ? html`<ic-button variant="primary" @click=${() => { this.step++; }}>
              Continue
            </ic-button>`
          : html`<ic-button variant="primary" @click=${this.complete}>
              Create Dashboard
            </ic-button>`}
      </div>
    </div>`;
  }
}

if (!customElements.get("enecess-setup")) {
  customElements.define("enecess-setup", EnecessSetup);
}
