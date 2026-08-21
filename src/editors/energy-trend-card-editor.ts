import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { normalizeEnergyTrendCardConfig } from "../config/trend-config-normalizer";
import { discoverEnergyMetrics, getTrendDiscoveryCandidates } from "../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../discovery/discovery.types";
import type { EnergyTrendCardConfig, TrendEntityConfig } from "../types/trend";
import { getPendingTrendScope, LocalStoragePendingTrendSeriesRepository } from "../repositories/local-storage-pending-trend-series-repository.ts";
import { getImportablePendingSeries, mergePendingSeries } from "./trend/pending-trend-import.ts";
import {
  LocalStoragePendingTrendRemovalRepository,
  matchesPendingTrendRemoval,
  type PendingTrendRemoval,
} from "../repositories/local-storage-pending-trend-removal-repository.ts";
import { editorLayoutStyles } from "./shared/editor-layout-styles.ts";
import {
  suppressHaAutomaticCardPreview,
  type HaAutomaticPreviewSuppression,
} from "./shared/ha-automatic-preview-suppressor.ts";
import type { FieldValueDetail } from "../components/common/field.ts";
import type { SegmentedChangeDetail } from "../components/common/segmented-control.ts";
import "./trend/trend-series-manager.ts";
import "../components/common/field.ts";
import "../components/common/segmented-control.ts";
import "../components/common/button.ts";

const timeframeOptions = [
  { value:"1H", label:"1H" }, { value:"24H", label:"24H" },
  { value:"7D", label:"7D" }, { value:"30D", label:"30D" },
];

export class EnergyTrendCardEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, lovelace:{ attribute:false }, config:{ state:true },
    pendingSeries:{ state:true }, pendingLoaded:{ state:true },
    pendingImportedCount:{ state:true }, pendingRemovals:{ state:true },
  };

  private _hass?:HomeAssistant;
  private discoveryCandidates:readonly DiscoveredMetric[] = [];
  lovelace?:unknown;
  private config?:EnergyTrendCardConfig;
  private pendingSeries:readonly TrendEntityConfig[] = [];
  private pendingLoaded = false;
  private pendingScope = "";
  private pendingImportedCount = 0;
  private pendingRemovals:readonly PendingTrendRemoval[] = [];
  private previewSuppression?:HaAutomaticPreviewSuppression;

  connectedCallback() {
    super.connectedCallback();
    this.previewSuppression = suppressHaAutomaticCardPreview(this);
  }

  disconnectedCallback() {
    this.previewSuppression?.disconnect();
    this.previewSuppression = undefined;
    super.disconnectedCallback();
  }

  static styles = [editorLayoutStyles, css`
    :host {
      --trend-editor-control-surface:var(--en-editor-control-surface);
      --trend-editor-control-surface-hover:var(--en-editor-control-surface-hover);
      --trend-editor-control-border:var(--en-editor-control-border);
      --trend-editor-control-divider:var(--en-editor-control-border);
      --trend-editor-expanded-surface:var(--en-editor-control-surface);
      --ic-control-background:var(--trend-editor-control-surface);
      --ic-border-control:1px solid var(--trend-editor-control-border);
      --ic-field-hover-border:var(--en-color-primary,var(--primary-color));
      --ic-action-hover-background:var(--trend-editor-control-surface-hover);
      --en-selection-surface:var(--trend-editor-control-surface-hover);
      --en-selection-border:1px solid var(--trend-editor-control-border);
    }
    .hint { color:var(--secondary-text-color); font-size:12px; line-height:1.4; }
    .pending-list { display:grid; gap:6px; }
    .pending-row {
      border:var(--ic-border-control);
      border-radius:var(--en-panel-radius,var(--ha-card-border-radius,12px));
      background:var(--en-editor-control-surface);
    }
    .pending-row summary { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; min-height:42px; padding:6px 12px; box-sizing:border-box; cursor:pointer; list-style:none; }
    .pending-row summary::-webkit-details-marker { display:none; }
    .pending-summary { display:grid; min-width:0; gap:2px; }
    .pending-summary strong { font-size:13px; font-weight:600; }
    .pending-summary span { color:var(--secondary-text-color); font-size:12px; }
    .pending-chevron { color:var(--secondary-text-color); font-size:0; transition:transform var(--en-motion-fast,180ms); }
    .pending-chevron::before { content:">"; font-size:13px; }
    .pending-row[open] .pending-chevron { transform:rotate(90deg); }
    .pending-actions { display:grid; gap:7px; padding:4px 12px 12px; }
    .pending-actions p { margin:0; }
    .pending-actions .success { color:var(--success-color,var(--primary-color)); }
    .pending-actions ic-button { justify-self:start; }
    ic-field, ic-segmented-control { width:100%; min-width:0; }
    .height-slider { display:grid; gap:7px; min-width:0; color:var(--primary-text-color); font-size:14px; font-weight:600; }
    .height-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .height-value { color:var(--secondary-text-color); font-size:13px; font-weight:500; }
    .height-slider input {
      width:100%; min-width:0; height:20px; margin:0; appearance:none;
      -webkit-appearance:none; background:transparent; cursor:pointer;
    }
    .height-slider input::-webkit-slider-runnable-track {
      height:6px; box-sizing:border-box;
      border:1px solid var(--trend-editor-control-border);
      border-radius:999px;
      background:linear-gradient(to right,
        var(--en-color-primary,var(--primary-color)) 0 var(--height-progress),
        var(--trend-editor-control-surface) var(--height-progress) 100%);
    }
    .height-slider input::-webkit-slider-thumb {
      width:17px; height:17px; margin-top:-6px; box-sizing:border-box;
      border:2px solid var(--ha-card-background,var(--card-background-color,#fff));
      border-radius:50%; background:var(--en-color-primary,var(--primary-color));
      box-shadow:0 0 0 1px var(--trend-editor-control-border),0 2px 5px rgba(0,0,0,.22);
      -webkit-appearance:none;
    }
    .height-slider input::-moz-range-track {
      height:6px; box-sizing:border-box;
      border:1px solid var(--trend-editor-control-border);
      border-radius:999px; background:var(--trend-editor-control-surface);
    }
    .height-slider input::-moz-range-progress {
      height:6px; border-radius:999px;
      background:var(--en-color-primary,var(--primary-color));
    }
    .height-slider input::-moz-range-thumb {
      width:17px; height:17px; box-sizing:border-box;
      border:2px solid var(--ha-card-background,var(--card-background-color,#fff));
      border-radius:50%; background:var(--en-color-primary,var(--primary-color));
      box-shadow:0 0 0 1px var(--trend-editor-control-border),0 2px 5px rgba(0,0,0,.22);
    }
    .height-slider input:focus-visible { outline:var(--ic-focus-ring); outline-offset:3px; }
  `];

  set hass(hass:HomeAssistant | undefined) {
    this._hass = hass;
    this.discoveryCandidates = hass
      ? getTrendDiscoveryCandidates(discoverEnergyMetrics(hass)) : [];
    this.requestUpdate();
  }
  get hass() { return this._hass; }

  setConfig(config:EnergyTrendCardConfig) {
    this.config = normalizeEnergyTrendCardConfig({
      ...config,
      entities:Array.isArray(config.entities)
        ? config.entities.map((entity) => ({ ...entity })) : [],
    });
    void this.loadPendingSeries();
  }

  private async loadPendingSeries() {
    if (!this.config) return;
    const scope = getPendingTrendScope(this.config);
    if (scope === this.pendingScope && this.pendingLoaded) return;
    this.pendingScope = scope;
    this.pendingLoaded = false;
    const [series, removals] = await Promise.all([
      new LocalStoragePendingTrendSeriesRepository().load(scope),
      new LocalStoragePendingTrendRemovalRepository().load(scope),
    ]);
    if (scope !== this.pendingScope) return;
    this.pendingSeries = series;
    this.pendingRemovals = removals;
    this.pendingLoaded = true;
    this.requestUpdate();
  }

  private importPendingSeries() {
    if (!this.config) return;
    const result = mergePendingSeries(this.config.entities, this.pendingSeries);
    if (!result.importedCount) return;
    this.pendingImportedCount = result.importedCount;
    this.emit({ entities:result.series });
  }

  private applyPendingRemovals() {
    if (!this.config) return;
    const entities = this.config.entities.filter((series) =>
      !this.pendingRemovals.some((removal) => matchesPendingTrendRemoval(series, removal))
    );
    if (entities.length !== this.config.entities.length) this.emit({ entities });
  }

  private emit(patch:Partial<EnergyTrendCardConfig>) {
    if (!this.config) return;
    const config = normalizeEnergyTrendCardConfig({ ...this.config, ...patch });
    this.config = config;
    void this.loadPendingSeries();
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail:{ config }, bubbles:true, composed:true,
    }));
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const pendingImportableCount = getImportablePendingSeries(
      this.config.entities, this.pendingSeries
    ).length;
    return html`<div class="editor">
      <section class="editor-section">
        <div class="section-heading"><div class="section-title">General</div></div>
        <div class="field-grid">
          <ic-field variant="compact" label="Title" .value=${this.config.title ?? ""}
            @field-input=${(event:CustomEvent<FieldValueDetail>) => this.emit({ title:event.detail.value })}>
          </ic-field>
          <label class="control-label">Default timeframe
            <ic-segmented-control width="full" .value=${this.config.timeframe ?? "24H"}
              .options=${timeframeOptions}
              @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) => this.emit({
                timeframe:event.detail.value as EnergyTrendCardConfig["timeframe"],
              })}></ic-segmented-control>
          </label>
        </div>
      </section>

      <section class="editor-section">
        <div class="section-heading">
          <div class="section-title">Series Appearance</div>
          <p class="section-description">Select a series to edit its appearance.</p>
        </div>
        <trend-series-manager .hass=${this.hass}
          .series=${this.config.entities} .candidates=${this.discoveryCandidates}
          .appearanceOnly=${true}
          @trend-series-list-changed=${(event:CustomEvent<{series:TrendEntityConfig[]}>) => {
            event.stopPropagation();
            this.emit({ entities:event.detail.series });
          }}></trend-series-manager>
      </section>

      ${this.pendingLoaded && (this.pendingSeries.length || this.pendingRemovals.length)
        ? this.renderPendingChanges(pendingImportableCount) : null}

      <section class="editor-section">
        <div class="section-heading"><div class="section-title">Layout</div></div>
        <label class="height-slider">
          <span class="height-heading"><span>Chart height</span><span class="height-value">${this.config.height ?? 350} px</span></span>
          <input type="range" min="240" max="600" step="1"
            style=${`--height-progress:${(((this.config.height ?? 350) - 240) / 360) * 100}%`}
            .value=${String(this.config.height ?? 350)}
            @input=${(event:Event) => this.emit({
              height:this.clampHeight(Number((event.target as HTMLInputElement).value)),
            })} />
        </label>
      </section>
    </div>`;
  }

  private renderPendingChanges(importableCount:number) {
    return html`<section class="editor-section">
      <div class="section-heading"><div class="section-title">Pending Changes</div></div>
      <div class="pending-list">
        ${this.pendingSeries.length ? html`<details class="pending-row">
          <summary><span class="pending-summary"><strong>Locally added Series</strong><span>${this.pendingSeries.length} available · ${importableCount} importable</span></span><span class="pending-chevron">›</span></summary>
          <div class="pending-actions">
          <p>${this.pendingSeries.length} local Series found · ${importableCount} importable.</p>
          ${importableCount ? html`<ic-button variant="secondary" @click=${this.importPendingSeries}>Import to card</ic-button>` : null}
          ${this.pendingImportedCount
            ? html`<p class="success">${this.pendingImportedCount} Series added to this draft. Click Save in the Home Assistant card editor to keep them permanently.</p>`
            : html`<p class="hint">Existing Lovelace Series are never overwritten.</p>`}
          </div>
        </details>` : null}
        ${this.pendingRemovals.length ? html`<details class="pending-row">
          <summary><span class="pending-summary"><strong>Locally removed Series</strong><span>${this.pendingRemovals.length} pending</span></span><span class="pending-chevron">›</span></summary>
          <div class="pending-actions">
          <p>${this.pendingRemovals.length} Series removal${this.pendingRemovals.length === 1 ? "" : "s"} ready to apply.</p>
          <ic-button variant="secondary" @click=${this.applyPendingRemovals}>Apply removals to card</ic-button>
          <p class="hint">Click Save in the Home Assistant card editor to remove them permanently.</p>
          </div>
        </details>` : null}
      </div>
    </section>`;
  }

  private clampHeight(value:number) {
    return Number.isFinite(value) ? Math.max(240, Math.min(600, Math.round(value))) : 350;
  }
}

if (!customElements.get("energy-trend-card-editor")) {
  customElements.define("energy-trend-card-editor", EnergyTrendCardEditor);
}
