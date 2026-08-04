import { LitElement, html, css } from "lit";

import type { HomeAssistant } from "custom-card-helpers";

import { kpiStyle } from "../styles/kpi";
import { dialogContentStyle } from "../design-system/dialog";

import {
  getNumber,
  getAttribute,
  getEntity
} from "../helpers/entity";
import { parseNumericEntityState } from "../helpers/entity-state-parser";
import { formatValue } from "../helpers/value-formatter";
import {
  createLinePath,
  createPolylinePoints,
} from "../helpers/line-chart";
import { normalizeKpiCardConfig } from "../config/config-normalizer";
import type { KpiCardConfig } from "../config/config.types";
import type { ConfigValidationResult } from "../config/config-validation";
import "./common/metric-value";
import "./common/icon-badge";
import "./common/trend-indicator";
import "./common/ic-card-container";
import "./common/card-settings-dialog";
import "./common/app-dialog";


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
  private _chartOpen = false;

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
    if (!this._hass || !this.config?.entity) {
      return null;
    }

    const state = parseNumericEntityState(this._hass, this.config.entity);
    if (state.status !== "valid" || state.value === null) {
      console.error(`[KPI] Entity not found: ${this.config.entity}`);
      return null;
    }

    const formatted = formatValue(
      state.value,
      state.unit || this.config.unit || "",
      {
      autoScale: this.config.autoScale ?? true,
      decimals: this.config.decimals ?? this.config.precision ?? 2,
      }
    );
    return {
      ...formatted,
      status: state.status,
      rawValue: state.value,
    };
  }

  private getDefaultSecondaryText(): string {
    const id = this.config.id?.toLowerCase() ?? "";
    const title = this.config.title?.toLowerCase() ?? "";
    const unit = this.config.unit?.toLowerCase() ?? "";

    if (
      id.includes("power") ||
      title.includes("power") ||
      id.includes("solar") ||
      title.includes("solar") ||
      unit === "w" ||
      unit === "kw"
    ) {
      return "Live";
    }
    if (id.includes("total") || title.includes("total")) return "Total";
    if (
      id.includes("today") ||
      id === "usage" ||
      title.includes("today") ||
      this.config.category === "cost"
    ) {
      return "Today";
    }
    return this.config.category === "energy" ? "Total" : "Live";
  }

  private isComparisonKpi(): boolean {
    const id = this.config.id?.toLowerCase() ?? "";
    const title = this.config.title?.toLowerCase() ?? "";
    return this.config.category === "cost" ||
      id === "usage" ||
      id.includes("today") ||
      id.includes("daily") ||
      id.includes("consumption") ||
      title.includes("today") ||
      title.includes("daily") ||
      title.includes("consumption") ||
      title.includes("cost");
  }

  getTrend() {
    const secondaryText = this.getDefaultSecondaryText();
    const comparisonKpi = this.isComparisonKpi();
    if (!this._hass || !this.config?.entity) {
      return { text: this.config.trend ?? secondaryText, color: "var(--secondary-text-color)" };
    }
    const entity = getEntity(this._hass, this.config.entity);
    if (!entity) return { text: this.config.trend ?? secondaryText, color: "var(--secondary-text-color)" };
    const today = Number(entity.state);
    const yesterday = Number(getAttribute(this._hass, this.config.entity, "last_period"));
    if (!comparisonKpi || !yesterday || isNaN(yesterday)) {
      return { text: this.config.trend ?? secondaryText, color: "var(--secondary-text-color)" };
    }
    const change = ((today - yesterday) / yesterday) * 100;
    const value = Math.abs(change).toFixed(1);
    if (change > 0) {
      return { text: `↑ ${value}% vs yesterday`, color: "#FF3B30" };
    }
    if (change < 0) {
      return { text: `↓ ${value}% vs yesterday`, color: "var(--en-color-success)" };
    }
    return { text: secondaryText, color: "var(--secondary-text-color)" };
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
        var(--kpi-padding,24px)
        var(--en-kpi-content-end-inset,9px)
        var(--kpi-padding,24px)
        var(--en-kpi-content-start-inset,4.5px);
    }

    ic-card-container.preview {
      --energy-card-height: 160px;
      cursor: default;
    }

    .chart-action {
      display: var(--kpi-chart-action-display, block);
      margin-top: 8px;
    }

    .chart-action button {
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.18);
      border-radius: var(--ic-radius-control);
      color: var(--primary-text-color);
      cursor: pointer;
      padding: 6px 10px;
      font-size: 0.9rem;
    }

    .chart-action button:hover {
      background: rgba(255,255,255,.2);
    }

    .sparkline {
      display: var(--kpi-sparkline-display, inline-flex);
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 30px;
      cursor: pointer;
      border-radius: var(--ic-radius-control);
      background: rgba(255,255,255,.05);
    }

    .sparkline-empty {
      color: var(--secondary-text-color);
      font-size: 0.78rem;
      padding: 6px 8px;
    }

    .config-error {
      color: var(--error-color, var(--secondary-text-color));
      font-size: 0.78rem;
      margin-top: 6px;
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

  private getSparklineData(): number[] {
    // Prefer explicit history in config (array of numbers)
    if (Array.isArray(this.config?.history) && this.config.history.length) {
      return this.config.history.map((v: any) => Number(v)).filter((n: number) => !isNaN(n));
    }

    // Fallback to today vs yesterday using existing attributes
    if (!this._hass || !this.config?.entity) return [];
    const today = Number(getNumber(this._hass, this.config.entity));
    const yesterday = Number(getAttribute(this._hass, this.config.entity, "last_period"));
    const arr: number[] = [];
    if (!isNaN(yesterday)) arr.push(yesterday);
    if (!isNaN(today)) arr.push(today);
    return arr;
  }

  private _toggleChart(e?: Event) {
    if (e) {
      e.stopPropagation();
    }
    this._chartOpen = !this._chartOpen;
    this.requestUpdate();
  }

  private renderChartModal(values: number[]) {
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    return html`
      <ic-app-dialog
        .open=${this._chartOpen}
        .title=${this.config.title ?? "Energy Trend"}
        @dialog-close=${() => this._toggleChart()}
      >
          <div class="chart-body">
            ${values.length ? html`
              <svg width="320" height="220" viewBox="0 0 320 220" preserveAspectRatio="none">
                <path d="${createLinePath(values, { width: 320, height: 180 })}" fill="none" stroke="var(--primary-text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                <polyline points="${createPolylinePoints(values, { width: 320, height: 180 })}" fill="none" stroke="var(--primary-text-color)" stroke-width="6" stroke-linecap="round"></polyline>
              </svg>
            ` : html`<div class="chart-empty">No trend data available</div>`}
          </div>
          <div class="chart-footer">
            <div>Min: ${min.toFixed(2)}</div>
            <div>Max: ${max.toFixed(2)}</div>
            <div>Points: ${values.length}</div>
          </div>
      </ic-app-dialog>
    `;
  }

  private _settingsOpen = false;
  private _settingsError = "";

  private _openSettings(e?: Event){
    if(e) e.stopPropagation();
    // notify parent that card settings opened
    this.dispatchEvent(new CustomEvent('open-card-settings', { detail: { id: this.config?.id || this.config?.entity || this.config?.title }, bubbles: true, composed: true }));
    this._settingsError = "";
    this._settingsOpen = true;
    this.requestUpdate();
  }

  private _closeSettings(){
    this._settingsError = "";
    this._settingsOpen = false;
    this.requestUpdate();
  }

  private _selectEntityForCard(entityId:string){
    const detail: {
      key: string | undefined;
      entity: string;
      result?: { success: boolean; reason?: string };
    } = {
      key: this.config?.id || this.config?.entity || this.config?.title,
      entity: entityId,
    };
    this.dispatchEvent(new CustomEvent('set-card-entity', {
      detail,
      bubbles: true,
      composed: true,
    }));
    if(detail.result?.success){
      this._settingsError = "";
      this._settingsOpen = false;
    }else{
      this._settingsError =
        detail.result?.reason ?? "Unable to update entity";
    }
    this.requestUpdate();
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
    const sparkData = this.getSparklineData();
    const iconTone = this.getIconTone();
    const path = createLinePath(sparkData, { width: 120, height: 28 });
    const result = html`
      <ic-card-container
        class=${this.previewMode ? "preview" : ""}
        @click=${this.previewMode ? undefined : this._openSettings}
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
            ${this.validation.status === "invalid"
              ? html`<div class="config-error">${this.validation.reason}</div>`
              : html``}
            ${this.previewMode
              ? null
              : html`
                <ic-trend-indicator
                  .text=${trend.text}
                  .status=${trendStatus}
                ></ic-trend-indicator>

                <div
                  class="sparkline"
                  style="margin-top:8px"
                  @click=${this._toggleChart}
                >
                  ${path
                    ? html`<svg width="120" height="30" viewBox="0 0 120 30" preserveAspectRatio="none">
                        <path d="${path}" fill="none" stroke="var(--primary-text-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg>`
                    : html`<div class="sparkline-empty">No trend data</div>`}
                </div>

                <div class="chart-action">
                  <button @click=${this._toggleChart}>View trend chart</button>
                </div>
              `}
          </div>

          <ic-icon-badge
            class=${this.getIconCategory()}
            .icon=${this.config.icon ?? "mdi:lightning-bolt"}
            .tone=${iconTone}
          ></ic-icon-badge>
        </div>
      </ic-card-container>

      ${this.previewMode ? null : this.renderChartModal(sparkData)}

      ${this.previewMode ? null : html`<ic-card-settings-dialog
        .open=${this._settingsOpen}
        .title=${"Change Entity"}
        .hass=${this._hass}
        .entity=${this.config.entity ?? ""}
        .error=${this._settingsError}
        .entityFilter=${{
          domains: ["sensor", "number", "input_number"],
        }}
        @settings-close=${()=>this._closeSettings()}
        @entity-selected=${(event: CustomEvent<{ entityId: string }>) =>
          this._selectEntityForCard(event.detail.entityId)}
      ></ic-card-settings-dialog>`}
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

console.log("Energy KPI Card Loaded v2");

