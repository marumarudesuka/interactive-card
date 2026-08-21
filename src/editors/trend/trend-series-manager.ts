import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { TrendEntityConfig } from "../../types/trend";
import { getTrendSeriesColor } from "../../helpers/trend-chart-formatters.ts";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import { moveItem, removeItem } from "../shared/item-list-operations.ts";
import { formatEntityId } from "../../helpers/text-formatter.ts";
import "../shared/discovery-entity-picker.ts";
import "./trend-series-editor.ts";
import "../../components/common/select-item.ts";

export class TrendSeriesManager extends LitElement {
  static properties = {
    hass:{ attribute:false }, series:{ attribute:false },
    candidates:{ attribute:false }, selectedId:{ state:true },
    appearanceOnly:{ type:Boolean },
  };
  hass?:HomeAssistant;
  series:readonly TrendEntityConfig[] = [];
  candidates:readonly DiscoveredMetric[] = [];
  appearanceOnly = false;
  private selectedId = "";

  static styles = css`
    :host { display:grid; width:100%; min-width:0; gap:8px; box-sizing:border-box; }
    .series-list { display:grid; min-width:0; gap:6px; }
    .series-container {
      min-width:0; overflow:hidden;
      border:var(--ic-border-control,var(--en-border,1px solid var(--divider-color)));
      border-radius:var(--en-panel-radius,var(--ha-card-border-radius,12px));
      background:var(--trend-editor-control-surface,var(--en-surface-secondary,var(--secondary-background-color,transparent)));
      box-shadow:0 1px 2px rgba(0,0,0,.05);
    }
    .series-container.expanded {
      border-color:var(--en-color-primary,var(--primary-color));
      box-shadow:0 0 0 1px var(--en-color-primary,var(--primary-color));
    }
    .series-row { display:flex; min-width:0; align-items:center; gap:8px; }
    ic-select-item {
      width:100%; min-width:0;
      --ic-select-item-height:42px;
      --ic-select-item-padding:5px 10px;
      --ic-border-control:0;
      --ic-control-background:transparent;
      --en-selection-border:0;
      --en-selection-surface:transparent;
    }
    ha-icon { width:16px; height:16px; --mdc-icon-size:16px; color:var(--secondary-text-color); }
    .series-chevron { transition:transform 160ms ease; }
    .series-chevron.open { transform:rotate(180deg); }
    .series-settings {
      display:grid; min-width:0; padding:12px; container-type:inline-size;
      border-top:var(--ic-border-control,var(--en-border,1px solid var(--divider-color)));
      background:var(--trend-editor-expanded-surface,var(--en-surface-secondary,var(--secondary-background-color,transparent)));
    }
    .empty { color:var(--secondary-text-color); font-size:13px; }
  `;

  private emit(series:readonly TrendEntityConfig[]) {
    this.dispatchEvent(new CustomEvent("trend-series-list-changed", {
      detail:{ series:series.map((item, order) => ({ ...item, order })) },
      bubbles:true,
      composed:true,
    }));
  }

  private key(item:TrendEntityConfig) { return item.id ?? item.entity; }

  render() {
    const configured = new Set(this.series.map((item) => item.entity));
    const available = this.candidates.filter((item) => !configured.has(item.entityId));
    return html`
      ${this.appearanceOnly ? null : html`<discovery-entity-picker label="Add series" .hass=${this.hass}
        .value=${""} .candidates=${available}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) => {
          const entity = event.detail.entityId;
          if (!entity || configured.has(entity)) return;
          const state = this.hass?.states[entity];
          const next:TrendEntityConfig = {
            entity,
            name:String(state?.attributes.friendly_name ?? entity),
            unit:String(state?.attributes.unit_of_measurement ?? "") || undefined,
            visible:true,
            enabled:true,
            chartMode:"area",
          };
          this.emit([...this.series, next]);
          this.selectedId = entity;
        }}></discovery-entity-picker>`}
      <div class="series-list">
      ${this.series.map((item, index) => {
        const itemKey = this.key(item);
        const expanded = itemKey === this.selectedId;
        return html`
        <div class=${`series-container${expanded ? " expanded" : ""}`}>
          <div class="series-row">
          <ic-select-item indicator="dot"
            .selected=${expanded}
            .displayLabel=${item.name || item.entity}
            .rawLabel=${item.name || item.entity}
            .secondaryLabel=${formatEntityId(item.entity,"compactMenu")}
            .rawSecondaryLabel=${item.entity}
            style=${`--ic-select-indicator-color:${getTrendSeriesColor(item.color, index, item.id)}`}
            @click=${() => { this.selectedId = expanded ? "" : itemKey; }}>
            <ha-icon class=${`series-chevron${expanded ? " open" : ""}`}
              slot="trailing" icon="mdi:chevron-down"></ha-icon>
          </ic-select-item>
          ${this.appearanceOnly ? null : html`<ha-button appearance="plain" aria-label="Move up"
            ?disabled=${index === 0}
            @click=${() => {
              if (!index) return;
              this.emit(moveItem(this.series, index, -1));
            }}>Up</ha-button>
          <ha-button appearance="plain" aria-label="Move down"
            ?disabled=${index === this.series.length - 1}
            @click=${() => {
              if (index >= this.series.length - 1) return;
              this.emit(moveItem(this.series, index, 1));
            }}>Down</ha-button>
          <ha-button appearance="plain" aria-label="Remove series"
            @click=${() => {
              this.emit(removeItem(
                this.series,
                (candidate) => this.key(candidate) === this.key(item)
              ));
              if (this.selectedId === itemKey) this.selectedId = "";
            }}>Remove</ha-button>`}
          </div>
          ${expanded ? html`
            <div class="series-settings">
              <trend-series-editor .hass=${this.hass} .series=${item}
                .candidates=${this.candidates}
                .appearanceOnly=${this.appearanceOnly}
                @trend-series-changed=${(event:CustomEvent<{series:TrendEntityConfig}>) => {
                  event.stopPropagation();
                  const updated = event.detail.series;
                  this.selectedId = this.key(updated);
                  this.emit(this.series.map((candidate) =>
                    this.key(candidate) === itemKey ? updated : candidate
                  ));
                }}></trend-series-editor>
            </div>
          ` : null}
        </div>
      `;})}
      ${this.series.length ? null : html`<div class="empty">No Series configured.</div>`}
      </div>
    `;
  }
}

if (!customElements.get("trend-series-manager")) {
  customElements.define("trend-series-manager", TrendSeriesManager);
}
