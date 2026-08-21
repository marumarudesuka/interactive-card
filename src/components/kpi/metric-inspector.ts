import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import type { KpiCardConfig } from "../../config/config.types";
import { parseNumericEntityState } from "../../helpers/entity-state-parser";
import { detailPanelStyle } from "../../styles/detail-panel.ts";
import "../common/app-dialog";

export interface KpiInspectRequestDetail {
  kpi: KpiCardConfig;
}

interface NativeHistoryCard extends HTMLElement {
  hass?: HomeAssistant;
}

interface HomeAssistantCardHelpers {
  createCardElement(config: Record<string, unknown>): NativeHistoryCard;
}

type HistoryStatus = "idle" | "loading" | "ready" | "error" | "unavailable";

export class MetricInspector extends LitElement {
  static properties = {
    open: { type: Boolean },
    hass: { attribute: false },
    kpi: { attribute: false },
  };

  open = false;
  hass?: HomeAssistant;
  kpi?: KpiCardConfig;
  private lastKpi?: KpiCardConfig;
  private historyStatus: HistoryStatus = "idle";
  private historyError = "";
  private historyRequest = 0;
  private nativeHistoryCard?: NativeHistoryCard;

  static styles = [detailPanelStyle, css`
    :host { display: contents; }
    .description {
      margin: 0;
    }
    .metadata { display: grid; gap: 10px; font-size: var(--en-body-size, 14px); }
    .metadata div { display: grid; grid-template-columns: minmax(100px, auto) 1fr; gap: 16px; }
    .metadata .metadata-value {
      min-width: 0;
      text-align: right;
    }
    .entity-value {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .history-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .native-history {
      display: block;
      width: 100%;
      min-height: 220px;
    }
    .history-state {
      display: grid;
      min-height: 220px;
      place-items: center;
      border: var(--ic-border-control, var(--en-border));
      border-radius: var(--en-panel-radius, 18px);
      text-align: center;
    }
  `];

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (this.kpi) this.lastKpi = this.kpi;
    if (!this.open) {
      if (changed.has("open")) this.resetHistory();
      return;
    }
    if (changed.has("open") || changed.has("kpi")) {
      void this.createNativeHistoryCard();
    }
    if (this.nativeHistoryCard && this.hass) {
      this.nativeHistoryCard.hass = this.hass;
    }
    this.mountNativeHistoryCard();
  }

  private close() {
    this.dispatchEvent(new CustomEvent("metric-inspector-close", {
      bubbles: true,
      composed: true,
    }));
  }

  private resetHistory() {
    this.historyRequest++;
    this.historyStatus = "idle";
    this.historyError = "";
    this.nativeHistoryCard = undefined;
  }

  private async createNativeHistoryCard() {
    const kpi = this.kpi;
    const hass = this.hass;
    const request = ++this.historyRequest;
    this.nativeHistoryCard = undefined;
    this.historyError = "";

    if (!kpi?.entity || !hass?.states?.[kpi.entity]) {
      this.historyStatus = "unavailable";
      this.requestUpdate();
      return;
    }

    const loadCardHelpers = (window as Window & {
      loadCardHelpers?: () => Promise<HomeAssistantCardHelpers>;
    }).loadCardHelpers;
    if (typeof loadCardHelpers !== "function") {
      this.historyStatus = "error";
      this.historyError = "Home Assistant history card helpers are unavailable.";
      console.warn("[ic-metric-inspector] Home Assistant loadCardHelpers() is unavailable");
      this.requestUpdate();
      return;
    }

    this.historyStatus = "loading";
    this.requestUpdate();
    try {
      const helpers = await loadCardHelpers();
      if (request !== this.historyRequest) return;
      const card = helpers.createCardElement({
        type: "history-graph",
        entities: [kpi.entity],
        hours_to_show: 24,
        show_names: false,
      });
      card.style.setProperty("--ha-card-background", "var(--en-surface-secondary)");
      card.style.setProperty("--card-background-color", "var(--en-surface-secondary)");
      card.style.setProperty("--primary-background-color", "var(--en-surface-secondary)");
      card.style.setProperty("--primary-text-color", "var(--en-surface-text-primary)");
      card.style.setProperty("--secondary-text-color", "var(--en-surface-text-secondary)");
      card.style.setProperty("--divider-color", "var(--en-surface-card-border)");
      card.style.setProperty("--ha-card-border-color", "var(--en-surface-card-border)");
      card.style.setProperty("--ha-card-box-shadow", "none");
      card.hass = hass;
      this.nativeHistoryCard = card;
      this.historyStatus = "ready";
    } catch (error) {
      if (request !== this.historyRequest) return;
      this.historyStatus = "error";
      this.historyError = error instanceof Error
        ? error.message
        : "Unable to create Home Assistant history graph.";
    }
    this.requestUpdate();
  }

  private mountNativeHistoryCard() {
    if (this.historyStatus !== "ready" || !this.nativeHistoryCard) return;
    const host = this.renderRoot.querySelector<HTMLElement>(".native-history");
    if (host && host.firstElementChild !== this.nativeHistoryCard) {
      host.replaceChildren(this.nativeHistoryCard);
    }
  }

  private formatLastUpdated(entityId: string): string {
    const timestamp = this.hass?.states?.[entityId]?.last_updated;
    if (!timestamp) return "Unavailable";
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "Unavailable";
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1_000));
    if (elapsedSeconds < 5) return "Updated just now";
    if (elapsedSeconds < 60) {
      return `Updated ${elapsedSeconds} second${elapsedSeconds === 1 ? "" : "s"} ago`;
    }
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) {
      return `Updated ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
    }
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
      return `Updated ${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
    }
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `Updated ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  private getMetricDescription(kpi: KpiCardConfig): string {
    const explicit = (kpi.subtitle ?? kpi.trend)?.trim();
    if (explicit) return explicit;
    const identity = `${kpi.id ?? ""} ${kpi.title ?? ""} ${kpi.entity ?? ""}`.toLowerCase();
    const unit = (kpi.unit ?? "").toLowerCase();
    if (kpi.category === "solar" || identity.includes("solar")) {
      return "Energy generated from solar production";
    }
    if (kpi.category === "cost" || identity.includes("cost")) {
      return "Calculated energy cost";
    }
    if (identity.includes("power") || unit === "w" || unit === "kw") {
      return "Real-time power consumption";
    }
    if (kpi.category === "energy" || unit === "wh" || unit === "kwh") {
      return "Accumulated energy usage";
    }
    return "Current entity information";
  }

  private getEntityLabel(friendlyName: string, entityId: string): string {
    const shortName = entityId.includes(".")
      ? entityId.slice(entityId.indexOf(".") + 1)
      : entityId;
    return friendlyName === shortName || friendlyName === entityId
      ? friendlyName
      : `${friendlyName} · ${shortName}`;
  }

  private renderHistory() {
    if (this.historyStatus === "loading" || this.historyStatus === "idle") {
      return html`<div class="history-state">Loading Home Assistant history…</div>`;
    }
    if (this.historyStatus === "unavailable") {
      return html`<div class="history-state">Entity is unavailable.</div>`;
    }
    if (this.historyStatus === "error") {
      return html`<div class="history-state">${this.historyError}</div>`;
    }
    return html`<div class="native-history"></div>`;
  }

  render() {
    const kpi = this.kpi ?? this.lastKpi;
    if (!kpi || !this.hass || !kpi.entity) return null;

    const parsed = parseNumericEntityState(this.hass, kpi.entity);
    const title = kpi.title ?? kpi.name ?? parsed.name;
    const entityLabel = this.getEntityLabel(parsed.name, kpi.entity);

    return html`
      <ic-app-dialog
        .open=${this.open}
        .title=${title}
        @dialog-close=${this.close}
      >
        <div class="body">
          <p class="description">${this.getMetricDescription(kpi)}</p>
          <div class="metadata">
            <div><span>Entity</span><span class="metadata-value entity-value" title=${entityLabel}>${entityLabel}</span></div>
            <div><span>Last updated</span><span class="metadata-value">${this.formatLastUpdated(kpi.entity)}</span></div>
          </div>
          <section aria-label="History">
            <div class="history-heading"><h3>History</h3><span>Last 24 hours</span></div>
            ${this.renderHistory()}
          </section>
        </div>
      </ic-app-dialog>
    `;
  }
}

if (!customElements.get("ic-metric-inspector")) {
  customElements.define("ic-metric-inspector", MetricInspector);
}
