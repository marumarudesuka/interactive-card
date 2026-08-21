import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { TrendEntityConfig } from "../../types/trend";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import "../shared/discovery-entity-picker.ts";
import "../../components/common/field.ts";
import "../../components/common/segmented-control.ts";
import type { FieldValueDetail } from "../../components/common/field.ts";
import type { SegmentedChangeDetail } from "../../components/common/segmented-control.ts";
import { getTrendSeriesColor } from "../../helpers/trend-chart-formatters.ts";

export class TrendSeriesEditor extends LitElement {
  static properties = {
    hass:{ attribute:false },
    series:{ attribute:false },
    candidates:{ attribute:false },
    appearanceOnly:{ type:Boolean },
  };

  hass?:HomeAssistant;
  series?:TrendEntityConfig;
  candidates:readonly DiscoveredMetric[] = [];
  appearanceOnly = false;
  private customColorDraft = false;
  private colorDraftSeriesKey = "";

  static styles = css`
    :host { display:grid; width:100%; min-width:0; box-sizing:border-box; gap:10px; container-type:inline-size; }
    .settings { display:grid; min-width:0; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px 14px; }
    label { display:grid; min-width:0; gap:7px; color:var(--primary-text-color); font-size:14px; font-weight:500; }
    .switch-row { display:flex; min-height:40px; align-items:center; justify-content:space-between; gap:16px; }
    discovery-entity-picker, ic-field, ic-segmented-control { width:100%; min-width:0; }
    .color-stack { display:grid; min-width:0; gap:7px; order:2; }
    .control-label { color:var(--primary-text-color); font-size:14px; font-weight:500; line-height:1.3; }
    .color-control {
      display:flex; height:var(--en-control-height-compact,38px); min-height:var(--en-control-height-compact,38px);
      max-height:var(--en-control-height-compact,38px); min-width:0; align-items:center; gap:8px;
      padding:0 var(--en-control-padding-inline-compact,14px); box-sizing:border-box;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-control-radius,16px);
      background:var(--ic-control-background,var(--en-surface-control));
    }
    .color-swatch { width:18px; height:18px; flex:0 0 18px; border-radius:50%; background:var(--series-preview-color); box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 18%,transparent); }
    .color-mode { min-width:0; flex:1 1 auto; overflow:hidden; color:var(--primary-text-color); font-size:13px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
    .custom-color-input { width:30px; height:26px; flex:0 0 30px; padding:2px; box-sizing:border-box; border:var(--ic-border-control,var(--en-border)); border-radius:8px; background:transparent; cursor:pointer; }
    .color-control ha-switch { flex:0 0 auto; transform:scale(.82); transform-origin:right center; }
    .stepper { display:grid; min-width:0; gap:7px; }
    .stepper-label { color:var(--primary-text-color); font-size:14px; font-weight:500; }
    .stepper-control { display:grid; grid-template-columns:38px minmax(42px,1fr) 38px; height:38px; border:var(--ic-border-control,var(--en-border)); border-radius:var(--en-control-radius,999px); overflow:hidden; background:var(--ic-control-background,var(--en-surface-control)); }
    .stepper-control button { border:0; background:var(--trend-editor-expanded-surface,transparent); color:var(--primary-text-color); cursor:pointer; font:inherit; font-size:18px; }
    .stepper-control button:first-child { border-right:1px solid var(--trend-editor-control-divider,var(--divider-color)); }
    .stepper-control button:last-child { border-left:1px solid var(--trend-editor-control-divider,var(--divider-color)); }
    .stepper-control button:hover { background:var(--ic-action-hover-background,rgba(127,127,127,.14)); }
    .stepper-control button:focus-visible { outline:var(--ic-focus-ring); outline-offset:-3px; }
    .stepper-value { display:grid; place-items:center; color:var(--primary-text-color); font-size:14px; font-weight:600; }
    .advanced { grid-column:1 / -1; border-top:1px solid var(--divider-color); }
    .display-name { order:1; }
    .chart-mode { order:3; }
    .axis-control { order:4; }
    .stepper { order:5; }
    .data-detail { order:6; }
    .advanced { order:99; }
    .advanced summary { padding:9px 2px; color:var(--secondary-text-color); cursor:pointer; font-size:13px; font-weight:600; list-style:none; }
    .advanced summary::-webkit-details-marker { display:none; }
    .advanced summary::after { content:">"; float:right; font-size:13px; transition:transform var(--en-motion-fast,180ms); }
    .advanced[open] summary::after { transform:rotate(90deg); }
    .advanced-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 14px; padding-top:4px; }
    @container (max-width:720px) { .settings { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @container (max-width:460px) { .settings,.advanced-grid { grid-template-columns:1fr; } }
  `;

  protected willUpdate(changed:Map<PropertyKey, unknown>) {
    if (!changed.has("series")) return;
    const key = this.series?.id ?? this.series?.entity ?? "";
    if (key === this.colorDraftSeriesKey) return;
    this.colorDraftSeriesKey = key;
    this.customColorDraft = false;
  }

  private emitSeries(patch:Partial<TrendEntityConfig>) {
    if (!this.series) return;
    this.dispatchEvent(new CustomEvent("trend-series-changed", {
      detail:{ series:{ ...this.series, ...patch } },
      bubbles:true,
      composed:true,
    }));
  }

  render() {
    if (!this.series || !this.hass) return html``;
    const useThemeColor = !this.series.color && !this.customColorDraft;
    const resolvedColor = getTrendSeriesColor(this.series.color, 0, this.series.id);
    return html`
      <div class="settings">
      <ic-field class="display-name" variant="compact" label="Display name" .value=${this.series.name ?? ""}
        @field-input=${(event:CustomEvent<FieldValueDetail>) => this.emitSeries({
          name:event.detail.value || undefined,
        })}></ic-field>
      <details class="advanced">
        <summary>Advanced</summary>
        <div class="advanced-grid">
      <discovery-entity-picker
        label="Entity correction"
        .hass=${this.hass}
        .value=${this.series.entity}
        .candidates=${this.candidates}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) => {
          const entity = event.detail.entityId;
          const state = this.hass?.states[entity];
          this.emitSeries({
            entity,
            name:this.series?.name ?? (String(state?.attributes.friendly_name ?? "") || undefined),
            unit:this.series?.unit ?? (String(state?.attributes.unit_of_measurement ?? "") || undefined),
          });
        }}
      ></discovery-entity-picker>
      <ic-field variant="compact" label="Unit override" placeholder="Auto" .value=${this.series.unit ?? ""}
        @field-input=${(event:CustomEvent<FieldValueDetail>) => this.emitSeries({
          unit:event.detail.value || undefined,
        })}></ic-field>
        </div>
      </details>
      <div class="stepper">
        <span class="stepper-label">Decimals</span>
        <div class="stepper-control">
          <button type="button" aria-label="Decrease decimals" @click=${() => this.emitSeries({ decimals:Math.max(0,(this.series?.decimals ?? 2)-1) })}>−</button>
          <span class="stepper-value">${this.series.decimals ?? 2}</span>
          <button type="button" aria-label="Increase decimals" @click=${() => this.emitSeries({ decimals:Math.min(4,(this.series?.decimals ?? 2)+1) })}>+</button>
        </div>
      </div>
      <div class="color-stack">
      <span class="control-label">Color</span>
      <div class="color-control" style=${`--series-preview-color:${resolvedColor}`}>
        <span class="color-swatch"></span>
        <span class="color-mode">${useThemeColor ? "Theme color" : (this.series.color ?? "Custom color")}</span>
        ${useThemeColor ? null : html`
          <input class="custom-color-input" type="color" aria-label="Custom series color"
            .value=${this.series.color ?? "#444D9E"}
            @input=${(event:Event) => {
              this.customColorDraft = false;
              this.emitSeries({ color:(event.target as HTMLInputElement).value });
            }} />
        `}
        <ha-switch .checked=${useThemeColor} aria-label="Use theme color"
          @change=${(event:Event) => {
            const checked = (event.target as HTMLInputElement).checked;
            this.customColorDraft = !checked;
            this.colorDraftSeriesKey = this.series?.id ?? this.series?.entity ?? "";
            if (checked && this.series?.color) this.emitSeries({ color:undefined });
            else this.requestUpdate();
          }}></ha-switch>
      </div>
      </div>
      <label class="chart-mode">Chart mode
        <ic-segmented-control width="full" .value=${this.series.chartMode ?? "line"}
          .options=${[{value:"area",label:"Area"},{value:"line",label:"Line"},{value:"bar",label:"Bar"}]}
          @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) => this.emitSeries({
            chartMode:event.detail.value as "area"|"line"|"bar",
          })}></ic-segmented-control>
      </label>
      <label class="axis-control">Axis
        <ic-segmented-control width="full" .value=${this.series.axis ?? "auto"}
          .options=${[{value:"auto",label:"Auto"},{value:"left",label:"Left"},{value:"right",label:"Right"}]}
          @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) => this.emitSeries({
            axis:event.detail.value as "auto"|"left"|"right",
          })}></ic-segmented-control>
      </label>
      <label class="data-detail">Data detail
        <ic-segmented-control width="full" .value=${this.series.renderMode ?? "smooth"}
          .options=${[{value:"smooth",label:"Auto"},{value:"high_precision",label:"Detailed"}]}
          @segmented-change=${(event:CustomEvent<SegmentedChangeDetail>) => this.emitSeries({
            renderMode:event.detail.value as "smooth"|"high_precision",
          })}></ic-segmented-control>
      </label>
      </div>
    `;
  }
}

if (!customElements.get("trend-series-editor")) {
  customElements.define("trend-series-editor", TrendSeriesEditor);
}
