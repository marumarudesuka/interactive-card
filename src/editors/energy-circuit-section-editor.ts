import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { discoverEnergyMetrics, getCircuitDiscoveryCandidates } from "../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../discovery/discovery.types";
import type { CircuitConfig, CircuitConfigInput, EnergyCircuitSectionConfig } from "../types/circuit";
import type { CircuitDetailRequest } from "../components/circuit/circuit-card.ts";
import type {
  CircuitConfigChangedDetail,
  CircuitDeleteRequestDetail,
} from "../components/circuit/circuit-settings-modal.ts";
import { resolveCircuit } from "../helpers/circuit-utils.ts";
import { LocalStorageCircuitConfigRepository } from "../repositories/local-storage-circuit-config-repository.ts";
import { getPendingCircuitScope, loadPendingCircuitsForConfig, LocalStoragePendingCircuitRepository } from "../repositories/local-storage-pending-circuit-repository.ts";
import { getImportableLegacyCircuits, mergeLegacyCircuits } from "./circuit/legacy-circuit-import.ts";
import { editorLayoutStyles } from "./shared/editor-layout-styles.ts";
import {
  suppressHaAutomaticCardPreview,
  type HaAutomaticPreviewSuppression,
} from "./shared/ha-automatic-preview-suppressor.ts";
import type { FieldValueDetail } from "../components/common/field.ts";
import "../components/circuit/circuit-card.ts";
import "../components/circuit/circuit-settings-modal.ts";
import "../components/common/field.ts";
import "../components/common/button.ts";

function normalizeEditorConfig(config:EnergyCircuitSectionConfig):EnergyCircuitSectionConfig {
  const configuredHeight = Number(config.cardHeight);
  return {
    ...config,
    title:config.title?.trim() || "Active Circuits",
    cardHeight:Number.isFinite(configuredHeight)
      ? Math.max(120,Math.min(240,Math.round(configuredHeight)))
      : undefined,
    circuits:Array.isArray(config.circuits)
      ? config.circuits.map((circuit, order) => ({
          ...circuit,
          enabled:circuit.enabled ?? true,
          order:circuit.order ?? order,
        }))
      : [],
  };
}

export class EnergyCircuitSectionEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, lovelace:{ attribute:false }, config:{ state:true },
    legacyCircuits:{ state:true }, importedCount:{ state:true },
    pendingCircuits:{ state:true }, pendingLoaded:{ state:true }, pendingImportedCount:{ state:true },
    settingsOpen:{ state:true }, selectedCircuit:{ state:true },
  };

  private _hass?:HomeAssistant;
  private metrics:readonly DiscoveredMetric[] = [];
  lovelace?:unknown;
  private config?:EnergyCircuitSectionConfig;
  private legacyCircuits:readonly CircuitConfigInput[] = [];
  private legacyLoadStarted = false;
  private importedCount = 0;
  private pendingCircuits:readonly CircuitConfigInput[] = [];
  private pendingLoaded = false;
  private pendingLoadScope = "";
  private pendingImportedCount = 0;
  private settingsOpen = false;
  private selectedCircuit?:CircuitConfig;
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
    .circuit-grid {
      --circuit-editor-scale:.68;
      --circuit-editor-source-height:150px;
      --circuit-editor-frame-height:calc(var(--circuit-editor-source-height) * var(--circuit-editor-scale));
      display:grid; min-width:0;
      grid-template-columns:repeat(4,minmax(0,1fr));
      grid-auto-rows:var(--circuit-editor-frame-height);
      gap:12px;
    }
    .circuit-frame {
      position:relative; width:100%; height:var(--circuit-editor-frame-height);
      min-width:0; overflow:visible;
    }
    .circuit-frame ic-circuit-card {
      display:block; width:calc(100% / var(--circuit-editor-scale));
      height:var(--circuit-editor-source-height); min-width:0;
      transform:scale(var(--circuit-editor-scale)); transform-origin:top left;
      --circuit-card-height:var(--circuit-editor-source-height);
    }
    .migration-list { display:grid; gap:10px; }
    .migration-item {
      display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px;
      padding:12px 14px; box-sizing:border-box;
      border:var(--ic-border-control,var(--en-border,1px solid var(--divider-color)));
      border-radius:var(--en-panel-radius,var(--ha-card-border-radius,12px));
      background:var(--en-editor-control-surface,var(--en-surface-secondary,var(--secondary-background-color,transparent)));
    }
    .migration-copy { display:grid; min-width:0; gap:3px; }
    .migration-copy strong { font-size:14px; }
    .migration-copy p,.migration-success { margin:0; color:var(--secondary-text-color); font-size:12px; line-height:1.4; }
    .migration-success { grid-column:1 / -1; color:var(--success-color,var(--primary-color)); }
    .height-slider { display:grid; gap:7px; min-width:0; color:var(--primary-text-color); font-size:14px; font-weight:600; }
    .height-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .height-value { color:var(--secondary-text-color); font-size:12px; font-weight:600; }
    .height-slider input { width:100%; min-width:0; margin:0; accent-color:var(--en-color-primary,var(--primary-color)); }
    @container (max-width:559px) {
      .circuit-grid {
        --circuit-editor-scale:.82;
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
    }
    @container (max-width:359px) {
      .circuit-grid {
        --circuit-editor-scale:1;
        grid-template-columns:1fr;
      }
      .migration-item { grid-template-columns:1fr; }
      .migration-item ic-button { justify-self:start; }
    }
  `];

  set hass(hass:HomeAssistant | undefined) {
    this._hass = hass;
    this.metrics = hass ? discoverEnergyMetrics(hass) : [];
    this.requestUpdate();
  }
  get hass() { return this._hass; }

  setConfig(config:EnergyCircuitSectionConfig) {
    this.config = normalizeEditorConfig(config);
    void this.loadLegacyCircuits();
    void this.loadPendingCircuits();
  }

  private get configuredCircuits():CircuitConfig[] {
    return (this.config?.circuits ?? []).map((circuit, order) => ({
      ...circuit,
      enabled:circuit.enabled ?? true,
      order:circuit.order ?? order,
    })).sort((left, right) => left.order - right.order);
  }

  private async loadPendingCircuits() {
    if (!this.config) return;
    const scope = getPendingCircuitScope(this.config);
    if (scope === this.pendingLoadScope && this.pendingLoaded) return;
    this.pendingLoadScope = scope;
    this.pendingLoaded = false;
    const result = await loadPendingCircuitsForConfig(
      new LocalStoragePendingCircuitRepository(), this.config
    );
    const circuits = result.circuits;
    if (scope !== this.pendingLoadScope) return;
    this.pendingCircuits = circuits;
    this.pendingLoaded = true;
    this.requestUpdate();
  }

  private async loadLegacyCircuits() {
    if (this.legacyLoadStarted) return;
    this.legacyLoadStarted = true;
    try {
      this.legacyCircuits = (await new LocalStorageCircuitConfigRepository().load()) ?? [];
    } catch (error) {
      console.warn("[energy-circuit-section-editor] Unable to inspect legacy Circuit storage", error);
      this.legacyCircuits = [];
    }
    this.requestUpdate();
  }

  private importLegacyCircuits() {
    if (!this.config) return;
    const result = mergeLegacyCircuits(this.config.circuits ?? [], this.legacyCircuits);
    if (!result.importedCount) return;
    this.importedCount = result.importedCount;
    this.emit({ circuits:result.circuits });
  }

  private importPendingCircuits() {
    if (!this.config) return;
    const result = mergeLegacyCircuits(this.config.circuits ?? [], this.pendingCircuits);
    if (!result.importedCount) return;
    this.pendingImportedCount = result.importedCount;
    this.emit({ circuits:result.circuits });
  }

  private emit(patch:Partial<EnergyCircuitSectionConfig>) {
    if (!this.config) return;
    const config = normalizeEditorConfig({ ...this.config, ...patch });
    this.config = config;
    void this.loadPendingCircuits();
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail:{ config }, bubbles:true, composed:true,
    }));
  }

  private openSettings(event:CustomEvent<CircuitDetailRequest>) {
    event.stopPropagation();
    this.selectedCircuit = { ...event.detail.circuit.config };
    this.settingsOpen = true;
    this.requestUpdate();
  }

  private closeSettings() {
    this.settingsOpen = false;
    this.selectedCircuit = undefined;
    this.requestUpdate();
  }

  private saveCircuit(event:CustomEvent<CircuitConfigChangedDetail>) {
    event.stopPropagation();
    if (!this.config) return event.detail.fail?.();
    const index = (this.config.circuits ?? []).findIndex(
      (circuit) => circuit.id === event.detail.circuit.id
    );
    if (index < 0) return event.detail.fail?.();
    const circuits = (this.config.circuits ?? []).map((circuit, itemIndex) =>
      itemIndex === index ? {
        ...circuit,
        ...event.detail.circuit,
        order:circuit.order ?? itemIndex,
        enabled:circuit.enabled ?? true,
      } : circuit
    );
    this.emit({ circuits });
    event.detail.complete?.();
  }

  private deleteCircuit(event:CustomEvent<CircuitDeleteRequestDetail>) {
    event.stopPropagation();
    if (!this.config) return event.detail.fail?.();
    const circuits = (this.config.circuits ?? []).filter(
      (circuit) => circuit.id !== event.detail.circuitId
    );
    if (circuits.length === (this.config.circuits ?? []).length) {
      return event.detail.fail?.();
    }
    this.emit({ circuits });
    event.detail.complete?.();
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const circuits = this.configuredCircuits;
    const importableCount = getImportableLegacyCircuits(circuits, this.legacyCircuits).length;
    const pendingImportableCount = getImportableLegacyCircuits(circuits, this.pendingCircuits).length;
    return html`<div class="editor">
      <section class="editor-section">
        <div class="section-heading"><div class="section-title">General</div></div>
        <ic-field variant="compact" label="Title" .value=${this.config.title ?? ""}
          @field-input=${(event:CustomEvent<FieldValueDetail>) => this.emit({ title:event.detail.value })}>
        </ic-field>
      </section>

      <section class="editor-section">
        <div class="section-heading">
          <div class="section-title">Circuit Cards</div>
          <p class="section-description">Click a card to edit its settings.</p>
        </div>
        <div class="circuit-grid" style=${`--circuit-editor-source-height:${this.config.cardHeight ?? 150}px`}>
          ${circuits.map((circuit) => html`
            <div class="circuit-frame">
              <ic-circuit-card
                .circuit=${resolveCircuit(this.hass, circuit)}
                .hass=${this.hass}
                .selected=${this.settingsOpen && this.selectedCircuit?.id === circuit.id}
                @circuit-detail-request=${this.openSettings}>
              </ic-circuit-card>
            </div>
          `)}
        </div>
      </section>

      ${this.renderPendingChanges(pendingImportableCount)}
      ${this.renderMigration(importableCount)}

      <section class="editor-section">
        <div class="section-heading"><div class="section-title">Layout</div></div>
        <label class="height-slider">
          <span class="height-heading"><span>Card height</span><span class="height-value">${this.config.cardHeight ?? 150} px</span></span>
          <input type="range" min="120" max="240" step="1"
            .value=${String(this.config.cardHeight ?? 150)}
            @input=${(event:Event) => this.emit({ cardHeight:Number((event.target as HTMLInputElement).value) })} />
        </label>
      </section>

      <ic-circuit-settings-modal
        .open=${this.settingsOpen}
        .hass=${this.hass}
        .circuit=${this.selectedCircuit}
        .discoveredMetrics=${getCircuitDiscoveryCandidates(this.metrics, this.selectedCircuit?.entity)}
        mode="edit"
        @circuit-settings-close=${this.closeSettings}
        @circuit-config-changed=${this.saveCircuit}
        @circuit-delete-request=${this.deleteCircuit}>
      </ic-circuit-settings-modal>
    </div>`;
  }

  private renderPendingChanges(pendingImportable:number) {
    if (!this.pendingCircuits.length) return null;
    return html`<section class="editor-section">
      <div class="section-heading">
        <div class="section-title">Pending Changes</div>
        <p class="section-description">Import locally added circuits into this draft.</p>
      </div>
      <div class="migration-list">
        <div class="migration-item">
          <div class="migration-copy">
            <strong>Locally added circuits</strong>
            <p>${this.pendingCircuits.length} available · ${pendingImportable} importable</p>
          </div>
          ${pendingImportable ? html`<ic-button variant="secondary" @click=${this.importPendingCircuits}>Import to card</ic-button>` : null}
          ${this.pendingImportedCount ? html`<p class="migration-success">${this.pendingImportedCount} circuits added to this draft. Click Save in Home Assistant.</p>` : null}
        </div>
      </div>
    </section>`;
  }

  private renderMigration(legacyImportable:number) {
    if (!this.legacyCircuits.length) return null;
    return html`<section class="editor-section">
      <div class="section-heading">
        <div class="section-title">Migration</div>
        <p class="section-description">Import legacy circuit data into this draft.</p>
      </div>
      <div class="migration-list">
        <div class="migration-item">
          <div class="migration-copy">
            <strong>Legacy circuits</strong>
            <p>${this.legacyCircuits.length} available · ${legacyImportable} importable</p>
          </div>
          ${legacyImportable ? html`<ic-button variant="secondary" @click=${this.importLegacyCircuits}>Import legacy</ic-button>` : null}
          ${this.importedCount ? html`<p class="migration-success">${this.importedCount} legacy circuits added to this draft. Click Save in Home Assistant.</p>` : null}
        </div>
      </div>
    </section>`;
  }
}

if (!customElements.get("energy-circuit-section-editor")) {
  customElements.define("energy-circuit-section-editor", EnergyCircuitSectionEditor);
}
