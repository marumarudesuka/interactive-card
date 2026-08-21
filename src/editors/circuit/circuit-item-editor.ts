import { LitElement, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { CircuitConfigInput } from "../../types/circuit";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import "../shared/discovery-entity-picker.ts";

export class CircuitItemEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, item:{ attribute:false }, candidates:{ attribute:false },
  };
  hass?:HomeAssistant;
  item?:CircuitConfigInput;
  candidates:readonly DiscoveredMetric[] = [];

  private emitItem(patch:Partial<CircuitConfigInput>) {
    if (!this.item) return;
    this.dispatchEvent(new CustomEvent("circuit-item-changed", {
      detail:{ item:{ ...this.item, ...patch } }, bubbles:true, composed:true,
    }));
  }

  render() {
    if (!this.item || !this.hass) return html``;
    return html`
      <discovery-entity-picker label="Entity" .hass=${this.hass}
        .value=${this.item.entity} .candidates=${this.candidates}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) =>
          this.emitItem({ entity:event.detail.entityId })}>
      </discovery-entity-picker>
      <ha-textfield label="Display name" .value=${this.item.name ?? ""}
        @input=${(event:Event) => this.emitItem({
          name:(event.target as HTMLInputElement).value,
        })}></ha-textfield>
      <ha-icon-picker label="Icon" .hass=${this.hass} .value=${this.item.icon ?? ""}
        @value-changed=${(event:CustomEvent<{value?:string}>) =>
          this.emitItem({ icon:event.detail.value || undefined })}></ha-icon-picker>
      <ha-textfield label="Category" .value=${this.item.category ?? ""}
        @input=${(event:Event) => this.emitItem({
          category:(event.target as HTMLInputElement).value || undefined,
        })}></ha-textfield>
      <label><span>Visible</span>
        <ha-switch .checked=${this.item.enabled !== false}
          @change=${(event:Event) => this.emitItem({
            enabled:(event.target as HTMLInputElement).checked,
          })}></ha-switch>
      </label>
    `;
  }
}

if (!customElements.get("circuit-item-editor")) {
  customElements.define("circuit-item-editor", CircuitItemEditor);
}
