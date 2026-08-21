import { LitElement, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { CustomKpiConfig } from "../../types/kpi";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import "../shared/discovery-entity-picker.ts";

export class KpiItemEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, item:{ attribute:false }, candidates:{ attribute:false },
  };
  hass?:HomeAssistant;
  item?:CustomKpiConfig;
  candidates:readonly DiscoveredMetric[] = [];

  private emitItem(patch:Partial<CustomKpiConfig>) {
    if (!this.item) return;
    this.dispatchEvent(new CustomEvent("kpi-item-changed", {
      detail:{ item:{ ...this.item, ...patch } }, bubbles:true, composed:true,
    }));
  }

  render() {
    if (!this.item || !this.hass) return html``;
    return html`
      <discovery-entity-picker label="Entity" .hass=${this.hass}
        .value=${this.item.entity ?? ""} .candidates=${this.candidates}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) =>
          this.emitItem({ entity:event.detail.entityId })}>
      </discovery-entity-picker>
      <ha-textfield label="Title" .value=${this.item.title ?? this.item.name ?? ""}
        @input=${(event:Event) => {
          const title = (event.target as HTMLInputElement).value;
          this.emitItem({ title, name:title });
        }}></ha-textfield>
      <ha-icon-picker label="Icon" .hass=${this.hass} .value=${this.item.icon ?? ""}
        @value-changed=${(event:CustomEvent<{value?:string}>) =>
          this.emitItem({ icon:event.detail.value || undefined })}></ha-icon-picker>
      <ha-textfield label="Unit" .value=${this.item.unit ?? ""}
        @input=${(event:Event) => this.emitItem({
          unit:(event.target as HTMLInputElement).value || undefined,
        })}></ha-textfield>
      <ha-textfield label="Decimals" type="number" min="0" max="4"
        .value=${String(this.item.decimals ?? this.item.precision ?? 2)}
        @change=${(event:Event) => {
          const decimals = Number((event.target as HTMLInputElement).value);
          if (Number.isFinite(decimals)) this.emitItem({ decimals });
        }}></ha-textfield>
      <label><span>Auto scale</span>
        <ha-switch .checked=${this.item.autoScale !== false}
          @change=${(event:Event) => this.emitItem({
            autoScale:(event.target as HTMLInputElement).checked,
          })}></ha-switch>
      </label>
      <ha-textfield label="Subtitle" .value=${this.item.subtitle ?? this.item.trend ?? ""}
        @input=${(event:Event) => this.emitItem({
          subtitle:(event.target as HTMLInputElement).value,
          trend:undefined,
        })}></ha-textfield>
      <ha-form .hass=${this.hass}
        .data=${{
          trendMode:this.item.trendMode ?? "none",
          category:this.item.category ?? "energy",
        }}
        .schema=${[
          { name:"trendMode", selector:{ select:{ options:[
            { value:"none", label:"None" },
            { value:"vs_yesterday", label:"Versus yesterday" },
            { value:"vs_last_period", label:"Versus last period" },
          ] } } },
          { name:"category", selector:{ text:{} } },
        ]}
        .computeLabel=${(schema:{name:string}) =>
          schema.name === "trendMode" ? "Trend behavior" : "Category"}
        @value-changed=${(event:CustomEvent<{value:Partial<CustomKpiConfig>}>) => {
          event.stopPropagation();
          this.emitItem(event.detail.value);
        }}></ha-form>
      <label><span>Visible</span>
        <ha-switch .checked=${this.item.enabled !== false}
          @change=${(event:Event) => this.emitItem({
            enabled:(event.target as HTMLInputElement).checked,
          })}></ha-switch>
      </label>
    `;
  }
}

if (!customElements.get("kpi-item-editor")) {
  customElements.define("kpi-item-editor", KpiItemEditor);
}
