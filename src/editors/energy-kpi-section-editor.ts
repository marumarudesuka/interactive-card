import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { normalizeEnergyKpiSectionConfig } from "../config/config-normalizer";
import { validateKpiCardConfig } from "../config/config-validation";
import type { EnergyKpiSectionConfig } from "../config/config.types";
import type { CustomKpiConfig } from "../types/kpi";
import type { KpiCardDraft } from "../types/kpi-card-builder.ts";
import type { KpiCardBuilderSubmitDetail } from "../components/kpi/kpi-card-builder-dialog.ts";
import type { FieldValueDetail } from "../components/common/field.ts";
import { getKpiCardKey } from "../data/kpi-card-model.ts";
import { getPendingKpiScope, LocalStoragePendingKpiRepository } from "../repositories/local-storage-pending-kpi-repository.ts";
import { getImportablePendingKpis, mergePendingKpis } from "./kpi/pending-kpi-import.ts";
import "../components/energy-kpi-card.ts";
import "../components/kpi/kpi-card-builder-dialog.ts";
import "../components/common/field.ts";
import "../components/common/button.ts";
import { editorLayoutStyles } from "./shared/editor-layout-styles.ts";
import { kpiCardVisualContextStyle } from "../styles/kpi-card-visual-context.ts";
import {
  suppressHaAutomaticCardPreview,
  type HaAutomaticPreviewSuppression,
} from "./shared/ha-automatic-preview-suppressor.ts";
import { getKpiCardGeometryStyle } from "../helpers/kpi-card-geometry.ts";
import { defaultKpiTemplates } from "../data/kpi-config.ts";
import { createKpiDiscoveryResults, discoverEnergyMetrics } from "../discovery/discovery-consumers.ts";
import {
  getVisibleEffectiveKpiCards,
  type EffectiveKpiCard,
} from "../helpers/kpi-effective-card-resolver.ts";
import {
  applyFormalKpiRemoval,
  type SelectedKpiContext,
} from "./kpi/kpi-editor-removal.ts";

export class EnergyKpiSectionEditor extends LitElement {
  private static readonly KPI_SOURCE_WIDTH = 288;
  static properties = { hass:{ attribute:false }, lovelace:{ attribute:false }, config:{ state:true } };
  private _hass?:HomeAssistant;
  lovelace?:unknown;
  private config?:EnergyKpiSectionConfig;
  private pending:readonly CustomKpiConfig[] = [];
  private discovery:ReturnType<typeof createKpiDiscoveryResults> = {};
  private pendingScope = "";
  private importedCount = 0;
  private selectedKey = "";
  private selectedKpiContext?:SelectedKpiContext;
  private settingsOpen = false;
  private settingsDraft:KpiCardDraft = {};
  private previewSuppression?:HaAutomaticPreviewSuppression;
  private kpiGridResizeObserver?:ResizeObserver;
  private observedKpiGrid?:HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    this.previewSuppression = suppressHaAutomaticCardPreview(this);
  }

  disconnectedCallback() {
    this.kpiGridResizeObserver?.disconnect();
    this.kpiGridResizeObserver = undefined;
    this.observedKpiGrid = undefined;
    this.previewSuppression?.disconnect();
    this.previewSuppression = undefined;
    super.disconnectedCallback();
  }

  protected updated() {
    this.observeKpiGrid();
    this.updateKpiGridGeometry();
  }

  static styles = [editorLayoutStyles, kpiCardVisualContextStyle, css`
    .pending-copy,.pending-success { margin:0; color:var(--en-text-secondary,var(--secondary-text-color)); font-size:13px; line-height:1.4; }
    .pending-section { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; padding:10px 12px; border:var(--ic-border-control,var(--en-border,1px solid var(--divider-color))); border-radius:var(--en-panel-radius,var(--ha-card-border-radius,12px)); background:var(--en-editor-control-surface,var(--en-surface-control,var(--secondary-background-color,transparent))); }
    .pending-text { display:grid; gap:3px; min-width:0; }
    .pending-label { font-size:14px; font-weight:600; }
    .pending-success { grid-column:1 / -1; }
    .height-slider { display:grid; gap:7px; min-width:0; color:var(--en-heading-primary,var(--primary-text-color)); font-size:14px; font-weight:600; }
    .height-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .height-value { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:12px; font-weight:600; }
    .height-slider input { width:100%; min-width:0; margin:0; accent-color:var(--en-color-primary,var(--primary-color)); }
    .kpi-card-grid {
      --kpi-editor-source-width:288px;
      --kpi-editor-source-height:170px;
      --kpi-editor-scale:.5;
      --kpi-editor-visible-height:85px;
      display:grid;
      min-width:0;
      grid-template-columns:repeat(4,minmax(0,1fr));
      grid-auto-rows:var(--kpi-editor-visible-height);
      gap:12px;
    }
    .kpi-card-selector {
      display:block;
      width:calc(var(--kpi-editor-source-width) * var(--kpi-editor-scale));
      height:var(--kpi-editor-visible-height);
      min-width:0;
      box-sizing:border-box;
      padding:0;
      border:0;
      overflow:visible;
      background:transparent;
      color:inherit;
      cursor:pointer;
      text-align:initial;
    }
    .kpi-editor-slot {
      display:flex;
      justify-content:center;
      width:100%;
      height:var(--kpi-editor-visible-height);
      min-width:0;
    }
    .kpi-scale-viewport {
      position:relative;
      width:100%;
      height:var(--kpi-editor-visible-height);
      min-width:0;
      overflow:visible;
    }
    .kpi-source-frame {
      width:var(--kpi-editor-source-width);
      height:var(--kpi-editor-source-height);
      transform:scale(var(--kpi-editor-scale));
      transform-origin:top left;
      --kpi-card-height:var(--kpi-editor-source-height);
    }
    .kpi-source-frame energy-kpi-card {
      display:block;
      width:100%;
      height:100%;
      min-width:0;
      pointer-events:none;
    }
    .kpi-card-selector:focus-visible {
      outline:var(--ic-focus-ring,2px solid var(--primary-color));
      outline-offset:2px;
      border-radius:var(--ha-card-border-radius,12px);
    }
    @container (max-width:559px) {
      .kpi-card-grid {
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
    }
    @container (max-width:359px) {
      .kpi-card-grid {
        grid-template-columns:1fr;
      }
      .pending-section { grid-template-columns:1fr; }
      .pending-section ic-button { justify-self:start; }
    }
  `];

  set hass(hass:HomeAssistant | undefined) {
    this._hass = hass;
    this.discovery = hass
      ? createKpiDiscoveryResults(discoverEnergyMetrics(hass),defaultKpiTemplates)
      : {};
    this.requestUpdate();
  }
  get hass() { return this._hass; }

  private observeKpiGrid() {
    const grid = this.renderRoot.querySelector<HTMLElement>(".kpi-card-grid");
    if (grid === this.observedKpiGrid) return;
    this.kpiGridResizeObserver?.disconnect();
    this.observedKpiGrid = grid ?? undefined;
    if (!grid || typeof ResizeObserver === "undefined") return;
    this.kpiGridResizeObserver = new ResizeObserver(() => this.updateKpiGridGeometry());
    this.kpiGridResizeObserver.observe(grid);
  }

  private updateKpiGridGeometry() {
    const grid = this.observedKpiGrid;
    const slot = grid?.querySelector<HTMLElement>(".kpi-editor-slot");
    if (!grid || !slot) return;
    const slotWidth = slot.getBoundingClientRect().width;
    if (!Number.isFinite(slotWidth) || slotWidth <= 0) return;
    const sourceHeight = this.config?.cardHeight ?? 170;
    const scale = Math.min(1, slotWidth / EnergyKpiSectionEditor.KPI_SOURCE_WIDTH);
    grid.style.setProperty("--kpi-editor-scale", String(scale));
    grid.style.setProperty("--kpi-editor-visible-height", `${sourceHeight * scale}px`);
  }

  setConfig(config:EnergyKpiSectionConfig) {
    this.config = normalizeEnergyKpiSectionConfig({
      ...config,
      cards:Array.isArray(config.cards) ? config.cards.map((item) => ({ ...item })) : [],
    });
    void this.loadPending();
  }

  private async loadPending() {
    if (!this.config) return;
    const scope = getPendingKpiScope(this.config);
    this.pendingScope = scope;
    const pending = await new LocalStoragePendingKpiRepository().load(scope);
    if (scope !== this.pendingScope) return;
    this.pending = pending;
    this.requestUpdate();
  }

  private importPending() {
    if (!this.config) return;
    const result = mergePendingKpis(this.config.cards, this.pending);
    this.importedCount = result.importedCount;
    if (result.importedCount) this.emit({ cards:result.items });
  }

  private openKpiSettings(item:EffectiveKpiCard) {
    if (!this.config) return;
    const key = getKpiCardKey(item.config);
    if (!key) return;
    this.selectedKpiContext = {
      key,
      origin:item.origin,
      discoveryFilled:item.discoveryFilled,
      isBuiltInTemplate:defaultKpiTemplates.some((template) => template.id === item.config.id),
      originalConfig:{ ...item.config },
    };
    this.selectedKey = key;
    this.settingsDraft = { ...item.config };
    this.settingsOpen = true;
    this.requestUpdate();
  }

  private closeKpiSettings() {
    this.settingsOpen = false;
    this.selectedKey = "";
    this.selectedKpiContext = undefined;
    this.requestUpdate();
  }

  private saveKpiSettings(event:CustomEvent<KpiCardBuilderSubmitDetail>) {
    event.stopPropagation();
    if (!this.config || !this.selectedKey) return;
    const existing = this.config.cards.find((item) => getKpiCardKey(item) === this.selectedKey);
    const updated = {
      ...(existing ?? this.selectedKpiContext?.originalConfig ?? {}),
      ...event.detail.config,
      id:existing?.id ?? this.selectedKpiContext?.originalConfig.id ?? event.detail.config.id,
      type:existing?.type ?? this.selectedKpiContext?.originalConfig.type,
      order:existing?.order ?? this.selectedKpiContext?.originalConfig.order,
      enabled:existing?.enabled ?? this.selectedKpiContext?.originalConfig.enabled ?? true,
    };
    const cards = existing
      ? this.config.cards.map((item) => getKpiCardKey(item) === this.selectedKey ? updated : item)
      : [...this.config.cards,updated];
    this.emit({ cards });
    this.closeKpiSettings();
  }

  private async removeKpi() {
    if (!this.config || !this.selectedKpiContext) return;
    const context = this.selectedKpiContext;
    if (context.origin === "pending") {
      await new LocalStoragePendingKpiRepository().remove(this.pendingScope,context.key);
      this.pending = await new LocalStoragePendingKpiRepository().load(this.pendingScope);
    }
    const cards = applyFormalKpiRemoval(this.config.cards,context);
    const formalChanged = cards.length !== this.config.cards.length || cards.some(
      (item,index) => JSON.stringify(item) !== JSON.stringify(this.config?.cards[index])
    );
    if (formalChanged) this.emit({ cards });
    else this.requestUpdate();
    this.closeKpiSettings();
  }

  private emit(patch:Partial<EnergyKpiSectionConfig>) {
    if (!this.config) return;
    const config = normalizeEnergyKpiSectionConfig({ ...this.config, ...patch });
    this.config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail:{ config }, bubbles:true, composed:true }));
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const importableCount = getImportablePendingKpis(this.config.cards, this.pending).length;
    const effectiveCards = getVisibleEffectiveKpiCards({
      templates:defaultKpiTemplates,
      formalCards:this.config.cards,
      pendingCards:this.pending,
      discovery:this.discovery,
    });
    return html`<div class="editor">
      <section class="editor-section">
        <div class="section-heading"><div class="section-title">General</div></div>
        <ic-field label="Title" .value=${this.config.title ?? ""}
          @field-input=${(event:CustomEvent<FieldValueDetail>) => this.emit({ title:event.detail.value })}></ic-field>
      </section>
      <section class="editor-section">
        <div class="section-heading">
          <div class="section-title">KPI Cards</div>
          <p class="section-description">Click a card to edit its settings.</p>
        </div>
        <div class="kpi-card-grid" style=${(() => {
          const sourceHeight = this.config?.cardHeight ?? 170;
          return [
            `--kpi-editor-source-width:${EnergyKpiSectionEditor.KPI_SOURCE_WIDTH}px`,
            `--kpi-editor-source-height:${sourceHeight}px`,
            `--kpi-editor-visible-height:${sourceHeight * .5}px`,
            getKpiCardGeometryStyle(sourceHeight),
          ].join(";");
        })()}>
          ${effectiveCards.map((item) => html`
            <div class="kpi-editor-slot">
              <button class="kpi-card-selector" type="button"
                aria-label=${`Edit ${item.config.title ?? item.config.name ?? item.config.entity ?? "KPI"}`}
                @click=${() => this.openKpiSettings(item)}>
                <div class="kpi-scale-viewport">
                  <div class="kpi-source-frame kpi-card-visual-context">
                    <energy-kpi-card .config=${item.config} .hass=${this.hass}
                      .validation=${validateKpiCardConfig(item.config)}></energy-kpi-card>
                  </div>
                </div>
              </button>
            </div>
          `)}
        </div>
      </section>
      ${this.pending.length ? html`
        <section class="editor-section">
          <div class="section-heading"><div class="section-title">Pending Changes</div></div>
          <div class="pending-section">
            <div class="pending-text">
              <span class="pending-label">Locally added KPIs</span>
              <p class="pending-copy">${this.pending.length} locally added · ${importableCount} importable</p>
            </div>
            ${importableCount ? html`<ic-button variant="secondary" @click=${this.importPending}>Import to card</ic-button>` : null}
            ${this.importedCount ? html`<p class="pending-success">${this.importedCount} KPI cards added to this draft. Click Save in the Home Assistant editor.</p>` : null}
          </div>
        </section>
      ` : null}
      <section class="editor-section">
        <div class="section-heading"><div class="section-title">Layout</div></div>
        <label class="height-slider">
          <span class="height-heading"><span>Card height</span><span class="height-value">${this.config.cardHeight ?? 170} px</span></span>
          <input type="range" min="130" max="240" step="1"
            .value=${String(this.config.cardHeight ?? 170)}
            @input=${(event:Event) => this.emit({ cardHeight:Number((event.target as HTMLInputElement).value) })} />
        </label>
      </section>
      <ic-kpi-card-builder-dialog .open=${this.settingsOpen} mode="edit" .hass=${this.hass}
        .draft=${this.settingsDraft} .canDelete=${true}
        .existingIds=${this.config.cards.map((item) => item.id).filter((id):id is string => Boolean(id))}
        @kpi-builder-close=${this.closeKpiSettings} @kpi-builder-submit=${this.saveKpiSettings}
        @kpi-builder-delete=${(event:Event) => { event.stopPropagation(); void this.removeKpi(); }}>
      </ic-kpi-card-builder-dialog>
    </div>`;
  }
}

if (!customElements.get("energy-kpi-section-editor")) {
  customElements.define("energy-kpi-section-editor", EnergyKpiSectionEditor);
}
