import { LitElement, html, css } from "lit";

import type { HomeAssistant } from "custom-card-helpers";

import { kpiStyle } from "../styles/kpi";
import { dialogContentStyle } from "../design-system/dialog";

import {
  resolveKpiMetricViewModel,
  resolveKpiTrendViewModel,
} from "../helpers/kpi-card-resolver";
import { normalizeKpiCardConfig } from "../config/config-normalizer";
import type { KpiCardConfig } from "../config/config.types";
import type { ConfigValidationResult } from "../config/config-validation";
import type { KpiInspectRequestDetail } from "./kpi/metric-inspector";
import "./common/metric-value";
import "./common/icon-badge";
import "./common/trend-indicator";
import "./common/ic-card-container";


export class EnergyKpiCard extends LitElement {
  static properties = {
    config: { attribute: false },
    validation: { attribute: false },
    previewMode: { type: Boolean, attribute: "preview-mode" },
  };

  private _hass!: HomeAssistant;
  config: KpiCardConfig = {};
  validation: ConfigValidationResult = { status: "valid" };
  previewMode = false;

  setConfig(config: KpiCardConfig) {
    if (!config || !config.entity) {
      throw new Error("Please define an entity");
    }
    this.config = normalizeKpiCardConfig(config);
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.requestUpdate();
  }

  getEnergyValue() {
    return resolveKpiMetricViewModel(this._hass, this.config);
  }

  getTrend() {
    return resolveKpiTrendViewModel(this._hass, this.config);
  }

  static styles = [kpiStyle, css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    ic-card-container {
      min-width: 0;
      --energy-card-height: var(--kpi-card-height, 170px);
      --energy-card-padding:
        var(--kpi-padding-block,var(--kpi-padding,24px))
        var(--en-kpi-content-end-inset,4.5px)
        var(--kpi-padding-block,var(--kpi-padding,24px))
        var(--en-kpi-content-start-inset,1.125px);
    }

    ic-card-container.preview {
      --energy-card-height: 160px;
      cursor: default;
    }

    .config-error {
      color: var(--error-color, var(--secondary-text-color));
      font-size: 0.78rem;
      margin-top: 6px;
    }

    .subtitle-slot .config-error {
      min-width: 0;
      overflow: hidden;
      margin-top: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chart-body {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
      background: transparent;
    }

    .chart-empty {
      color: var(--secondary-text-color);
      font-size: 0.95rem;
    }

    .chart-footer {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px 16px;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }

  `, dialogContentStyle];

  private getIconCategory(): "energy" | "power" | "cost" {
    const unit = (this.config.unit ?? "").toLowerCase();
    const identity = `${this.config.id ?? ""} ${this.config.title ?? ""}`.toLowerCase();
    if (this.config.category === "cost" || identity.includes("cost")) return "cost";
    if (unit === "w" || unit === "kw" || identity.includes("power")) return "power";
    return "energy";
  }

  private getIconTone(): "primary" | "accent" | "success" {
    const category = this.getIconCategory();
    return category === "power"
      ? "primary"
      : category === "cost"
        ? "accent"
        : "success";
  }

  private _openMoreInfo(e?: Event){
    if(e) e.stopPropagation();
    const entityId = this.config.entity?.trim();
    if (!entityId) return;

    const handled = !this.dispatchEvent(
      new CustomEvent<KpiInspectRequestDetail>("kpi-inspect-request", {
        detail: { kpi: { ...this.config } },
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    if (handled || !this._hass?.states?.[entityId]) return;

    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }));
  }

  renderSingle(cardConfig: KpiCardConfig = this.config) {
    const oldConfig = this.config;
    this.config = cardConfig;
    const trend = this.getTrend();
    const metric = this.getEnergyValue();
    const trendStatus =
      trend.color === "#FF3B30"
        ? "negative"
        : trend.color === "var(--en-color-success)"
          ? "positive"
          : "neutral";
    const iconTone = this.getIconTone();
    const result = html`
      <ic-card-container
        class=${this.previewMode ? "preview" : ""}
        @click=${this.previewMode ? undefined : this._openMoreInfo}
      >
        <div class="content">
          <div class="kpi-copy">
            <div class="name">
              ${this.config.title ?? "Energy"}
            </div>
            <ic-metric-value
              .value=${metric?.value ?? ""}
              .unit=${metric?.unit ?? (this.config.unit ?? "")}
              .status=${metric?.status ?? "unavailable"}
            ></ic-metric-value>
            <div class="subtitle-slot" aria-hidden=${
              !metric?.statusMessage && this.validation.status !== "invalid" &&
              (!trend.text || this.previewMode)
            }>
              ${metric?.statusMessage
                ? html`<div class="config-error">${metric.statusMessage}</div>`
                : this.validation.status === "invalid"
                  ? html`<div class="config-error">${this.validation.reason}</div>`
                  : !this.previewMode && trend.text
                    ? html`
                    <ic-trend-indicator
                      .text=${trend.text}
                      .status=${trendStatus}
                    ></ic-trend-indicator>
                    `
                    : null}
            </div>
          </div>

          <ic-icon-badge
            class=${this.getIconCategory()}
            .icon=${this.config.icon ?? "mdi:lightning-bolt"}
            .tone=${iconTone}
          ></ic-icon-badge>
        </div>
      </ic-card-container>

    `;    this.config = oldConfig;
    return result;
  }

  render() {
    if (!this.config) return html``;
    return this.renderSingle();
  }

  getCardSize(){
    return 3;
  }
}

customElements.define("energy-kpi-card", EnergyKpiCard);

(window as any).customCards = [...(window as any).customCards || [], { type: "energy-kpi-card", name: "Energy KPI Card", description: "Glass style energy KPI card" }];
