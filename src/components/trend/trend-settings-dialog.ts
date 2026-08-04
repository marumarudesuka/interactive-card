import { LitElement, css, html, type PropertyValues } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DialogCloseDetail } from "../common/app-dialog";
import type { EntitySelectedDetail } from "../entity-selector";
import type { EnergyTrendCardConfig } from "../../types/trend";
import { normalizeEnergyTrendCardConfig } from "../../config/trend-config-normalizer";
import { dialogContentStyle } from "../../design-system/dialog";
import {
  ENTITY_ID_DISPLAY_LENGTH,
  formatEntityId,
  truncateMiddle,
} from "../../helpers/text-formatter";
import "../common/app-dialog";
import "../common/scroll-area";
import "../common/button";
import "../common/segmented-control";
import type { SegmentedChangeDetail } from "../common/segmented-control";
import type { FieldValueDetail } from "../common/field";
import "../common/field";
import "../common/subpage-header";
import "../entity-selector";

export interface TrendSettingsSaveDetail {
  config: EnergyTrendCardConfig;
}

export interface TrendSettingsChangeDetail {
  config: EnergyTrendCardConfig;
}

export class TrendSettingsDialog extends LitElement {
  static properties = {
    open: { type:Boolean },
    config: { attribute:false },
    selectedEntity: { type:String, attribute:"selected-entity" },
    hass: { attribute:false },
  };

  open = false;
  config?: EnergyTrendCardConfig;
  selectedEntity = "";
  hass?:HomeAssistant;
  private draft = normalizeEnergyTrendCardConfig({ entities:[] });
  private configuredIndex = 0;
  private view: "list" | "series" = "list";
  private entityPickerExpanded = false;
  private manuallyEditedNames = new Set<number>();
  private manuallyEditedUnits = new Set<number>();

  static styles = [css`
    :host { display:contents; }
    ic-app-dialog {
      --app-dialog-width:620px;
      --ic-field-placeholder-opacity:.7;
    }
    ic-app-dialog.series-view {
      --ic-dialog-padding:20px 32px 24px;
    }
    .content {
      display:grid;
      max-height:min(560px,calc(100vh - 180px));
    }
    .section { display:grid; }
    .entity-field-group { display:grid; min-width:0; }
    .series-identity {
      display:flex;
      align-items:center;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .series-list { display:grid; gap:4px; }
    .series-list button {
      display:flex; width:100%; min-height:40px; box-sizing:border-box;
      align-items:center; gap:10px; padding:0 12px;
      border:1px solid transparent;
      border-radius:var(--ic-radius-control);
      background:transparent;
      color:var(--en-text-primary,var(--primary-text-color));
      cursor:pointer; font:inherit; font-size:14px; text-align:left;
    }
    .series-list button:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .series-list .series-label {
      min-width:0; flex:1 1 auto; overflow:hidden;
      text-overflow:ellipsis; white-space:nowrap;
    }
    .series-list ha-icon {
      flex:0 0 16px; width:16px; height:16px; --mdc-icon-size:16px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      opacity:.75;
      transform:translateY(var(--en-chevron-offset-y,-3px));
    }
    .switch {
      display:grid; width:32px; height:20px; place-items:center;
      border:0; border-radius:999px;
      background:var(--en-surface-secondary,rgba(127,127,127,.18)); cursor:pointer;
    }
    .switch::after {
      content:""; width:12px; height:12px; border-radius:50%;
      background:var(--en-control-active-foreground,#fff);
      box-shadow:0 1px 3px rgba(0,0,0,.18);
      transform:translateX(-6px); transition:transform var(--en-motion-fast,180ms);
    }
    .switch.on { background:var(--en-color-primary); }
    .switch.on::after { transform:translateX(6px); }
    .field-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:var(--en-field-group-gap,20px);
      padding:0;
      margin:0;
    }
    label { display:grid; }
    .wide { grid-column:1 / -1; }
    .parameter-row {
      display:flex; min-height:40px; align-items:center;
      justify-content:space-between; gap:16px;
      color:var(--en-text-secondary,var(--secondary-text-color));
      font-size:12px;
    }
    .parameter-row.wide { grid-column:1 / -1; }
    .parameter-copy { display:grid; gap:2px; }
    .parameter-value { color:var(--en-text-primary,var(--primary-text-color)); font-size:13px; }
    .chart-option {
      display:flex; min-height:40px; align-items:center;
      justify-content:space-between; gap:16px;
    }
    .chart-option > span {
      color:var(--en-text-primary,var(--primary-text-color));
      font-size:14px;
      font-weight:500;
    }
    .footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 24px; }
    .delete-action { margin-inline-end:auto; }
  `, dialogContentStyle];

  protected willUpdate(changed: PropertyValues<this>) {
    if ((changed.has("open") && this.open) ||
      (changed.has("config") && !this.open)) {
      this.draft = normalizeEnergyTrendCardConfig(this.config ?? { entities:[] });
      const requestedIndex = this.selectedEntity
        ? this.draft.entities.findIndex((entity) => entity.entity === this.selectedEntity)
        : -1;
      this.configuredIndex = requestedIndex >= 0 ? requestedIndex : 0;
      this.view = requestedIndex >= 0 ? "series" : "list";
      this.entityPickerExpanded = false;
      this.manuallyEditedNames = new Set(
        this.draft.entities.flatMap((entity, index) => {
          const state = this.hass?.states[entity.entity];
          const friendlyName = String(state?.attributes.friendly_name ?? "");
          const name = entity.name?.trim() ?? "";
          return name && name !== friendlyName && name !== entity.entity
            ? [index]
            : [];
        })
      );
      this.manuallyEditedUnits = new Set(
        this.draft.entities.flatMap((entity, index) => {
          const stateUnit = String(
            this.hass?.states[entity.entity]?.attributes.unit_of_measurement ?? ""
          );
          const unit = entity.unit?.trim() ?? "";
          return unit && unit !== stateUnit ? [index] : [];
        })
      );
    }
  }

  private updateEntity(
    index: number,
    changes: Partial<EnergyTrendCardConfig["entities"][number]>,
    emit = true
  ) {
    this.draft = {
      ...this.draft,
      entities:this.draft.entities.map((entity, entityIndex) =>
        entityIndex === index ? { ...entity, ...changes } : entity
      ),
    };
    this.requestUpdate();
    if (emit) this.emitChange();
  }

  private selectEntity(event:CustomEvent<EntitySelectedDetail>) {
    event.stopPropagation();
    const entityId = event.detail.entityId;
    const state = this.hass?.states[entityId];
    const changes:Partial<EnergyTrendCardConfig["entities"][number]> = {
      entity:entityId,
    };
    if (!this.manuallyEditedNames.has(this.configuredIndex)) {
      changes.name = String(state?.attributes.friendly_name ?? entityId);
    }
    if (!this.manuallyEditedUnits.has(this.configuredIndex)) {
      changes.unit = String(state?.attributes.unit_of_measurement ?? "");
    }
    this.updateEntity(this.configuredIndex, changes, false);
    this.entityPickerExpanded = false;
  }

  private handleDialogClose(event:CustomEvent<DialogCloseDetail>) {
    event.stopPropagation();
    if (event.detail.reason === "escape" && this.entityPickerExpanded) {
      this.entityPickerExpanded = false;
      this.requestUpdate();
      return;
    }
    this.close();
  }

  private updateChart(changes: Partial<EnergyTrendCardConfig>) {
    this.draft = { ...this.draft, ...changes };
    this.requestUpdate();
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(new CustomEvent<TrendSettingsChangeDetail>("trend-settings-change", {
      detail:{ config:normalizeEnergyTrendCardConfig(this.draft) },
      bubbles:true,
      composed:true,
    }));
  }

  private close() {
    this.dispatchEvent(new CustomEvent("trend-settings-close", { bubbles:true, composed:true }));
  }

  private save() {
    this.dispatchEvent(new CustomEvent<TrendSettingsSaveDetail>("trend-settings-save", {
      detail:{ config:normalizeEnergyTrendCardConfig(this.draft) },
      bubbles:true,
      composed:true,
    }));
  }

  private deleteSeries() {
    if (this.view !== "series") return;
    const selected = this.draft.entities[this.configuredIndex];
    if (!selected) return;
    this.draft = {
      ...this.draft,
      entities:this.draft.entities.filter(
        (entity) => entity.entity !== selected.entity
      ),
    };
    this.configuredIndex = Math.max(
      0,
      Math.min(this.configuredIndex, this.draft.entities.length - 1)
    );
    this.selectedEntity = "";
    this.entityPickerExpanded = false;
    this.view = "list";
    this.requestUpdate();
    this.emitChange();
  }

  render() {
    const selected = this.draft.entities[this.configuredIndex];
    return html`
      <ic-app-dialog class=${this.view === "series" ? "series-view" : ""}
        .open=${this.open} title="Trend Settings"
        @dialog-close=${this.handleDialogClose}
        @click=${() => {
          if (!this.entityPickerExpanded) return;
          this.entityPickerExpanded = false;
          this.requestUpdate();
        }}>
        ${this.view === "series" ? html`
          <ic-subpage-header slot="header"
            title="Edit Series"
            @subpage-back=${() => {
              this.view = "list";
              this.requestUpdate();
            }}>
          </ic-subpage-header>
        ` : html`<span slot="header">Trend Settings</span>`}
        <ic-scroll-area class="content">
          ${this.view === "series" && selected ? html`
            <section class="section">
              <div class="entity-field-group"
                @click=${(event:Event) => event.stopPropagation()}>
                <ic-field variant="selectable"
                  .value=${formatEntityId(selected.entity,"readonlyField")}
                  .rawValue=${selected.entity}
                  aria-expanded=${this.entityPickerExpanded}
                  @field-activate=${() => {
                    this.entityPickerExpanded = !this.entityPickerExpanded;
                    this.requestUpdate();
                  }}></ic-field>
                ${this.entityPickerExpanded ? html`
                  <ic-entity-selector variant="inline"
                    .hass=${this.hass}
                    .value=${selected.entity}
                    .filter=${{ domains:["sensor"] }}
                    .preferredDeviceClasses=${[
                      "power", "energy", "monetary", "current", "voltage",
                    ]}
                    .preferredUnits=${["W", "kW", "MW", "Wh", "kWh", "MWh"]}
                    @entity-selected=${this.selectEntity}>
                  </ic-entity-selector>
                ` : null}
              </div>
              <div class="field-grid">
                <ic-field class="wide" label="Display Name" .value=${selected.name ?? ""}
                  @field-input=${(event:CustomEvent<FieldValueDetail>) => {
                    this.manuallyEditedNames.add(this.configuredIndex);
                    this.updateEntity(this.configuredIndex, {
                      name:event.detail.value,
                    });
                  }}></ic-field>
                <ic-field label="Unit" placeholder="Auto" .value=${selected.unit ?? ""}
                  @field-input=${(event:CustomEvent<FieldValueDetail>) => {
                    this.manuallyEditedUnits.add(this.configuredIndex);
                    this.updateEntity(this.configuredIndex, {
                      unit:event.detail.value,
                    });
                  }}></ic-field>
                <label class="wide">Chart Mode
                  <ic-segmented-control width="fit" label="Chart mode" .value=${selected.chartMode ?? "line"}
                    .options=${[{value:"line",label:"Line"},{value:"area",label:"Area"},{value:"bar",label:"Bar"}]}
                    @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                      this.updateEntity(this.configuredIndex, { chartMode:event.detail.value as "line"|"area"|"bar" })}>
                  </ic-segmented-control>
                </label>
                <label class="wide">Axis
                  <ic-segmented-control width="fit" label="Axis" .value=${selected.axis ?? "auto"}
                    .options=${[
                      {value:"auto",label:"Auto"},
                      {value:"left",label:"Left"},
                      {value:"right",label:"Right"},
                    ]}
                    @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                      this.updateEntity(this.configuredIndex, {
                        axis:event.detail.value as "auto"|"left"|"right",
                      })}>
                  </ic-segmented-control>
                </label>
                <label class="wide">Decimal Places
                  <ic-segmented-control width="fit" label="Decimal places" .value=${String(selected.decimals ?? 2)}
                    .options=${[0,1,2,3,4].map((value) => ({value:String(value),label:String(value)}))}
                    @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                      this.updateEntity(this.configuredIndex, { decimals:Number(event.detail.value) })}>
                  </ic-segmented-control>
                </label>
                <label class="wide">Resolution
                  <ic-segmented-control width="fit" label="Data resolution" .value=${selected.renderMode ?? "smooth"}
                    .options=${[{value:"smooth",label:"Auto"},{value:"high_precision",label:"Detailed"}]}
                    @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) =>
                      this.updateEntity(this.configuredIndex, { renderMode:event.detail.value as "smooth"|"high_precision" })}>
                  </ic-segmented-control>
                </label>
              </div>
            </section>
          ` : html`
            <section class="section">
              <div class="section-title">Series</div>
              ${this.draft.entities.length ? html`
                <div class="series-list">
                  ${this.draft.entities.map((entity, index) => html`
                    <button type="button"
                      @click=${() => {
                        this.configuredIndex = index;
                        this.view = "series";
                        this.requestUpdate();
                      }}>
                      <span class="series-label" title=${entity.name ?? entity.entity}>
                        ${truncateMiddle(entity.name ?? entity.entity, {
                          maxLength:ENTITY_ID_DISPLAY_LENGTH.readonlyField,
                        })}
                      </span>
                      <ha-icon icon="mdi:chevron-right"></ha-icon>
                    </button>
                  `)}
                </div>
              ` : html`<div class="field-control series-identity">No series configured</div>`}
            </section>
            <section class="section">
              <div class="section-title">Chart Settings</div>
              <div class="chart-option">
                <span>Full Width</span>
                <button class="switch ${this.draft.fullWidth !== false ? "on" : ""}" type="button"
                  @click=${() => this.updateChart({ fullWidth:this.draft.fullWidth === false })}></button>
              </div>
              <ic-field label="Chart Height" type="number" .value=${String(this.draft.height ?? 350)}
                @field-change=${(event:CustomEvent<FieldValueDetail>) => this.updateChart({
                  height:Number(event.detail.value) })}></ic-field>
            </section>
          `}
        </ic-scroll-area>
        <div class="footer" slot="footer">
          ${this.view === "series" ? html`
            <ic-button class="delete-action" variant="destructive"
              @click=${this.deleteSeries}>Delete</ic-button>
          ` : null}
          <ic-button @click=${this.close}>Cancel</ic-button>
          <ic-button variant="primary" @click=${this.save}>Save</ic-button>
        </div>
      </ic-app-dialog>
    `;
  }
}

customElements.define("ic-trend-settings-dialog", TrendSettingsDialog);
