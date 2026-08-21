import { LitElement, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { DiscoveredMetric } from "../../discovery/discovery.types";

interface ValueChangedDetail { value?:string; }

export interface DiscoveryEntitySelectedDetail {
  entityId:string;
}

export class DiscoveryEntityPicker extends LitElement {
  static properties = {
    hass:{ attribute:false }, value:{ type:String }, label:{ type:String },
    candidates:{ attribute:false }, allowCustomEntity:{ type:Boolean },
  };
  hass?:HomeAssistant;
  value = "";
  label = "Entity";
  candidates:readonly DiscoveredMetric[] = [];
  allowCustomEntity = true;

  render() {
    const includeEntities = Array.from(new Set([
      this.value,
      ...this.candidates.map((candidate) => candidate.entityId),
    ].filter(Boolean)));
    return html`
      <ha-entity-picker .label=${this.label} .hass=${this.hass}
        .value=${this.value} .includeEntities=${includeEntities}
        .allowCustomEntity=${this.allowCustomEntity}
        @value-changed=${(event:CustomEvent<ValueChangedDetail>) => {
          const entityId = event.detail.value?.trim();
          if (!entityId) return;
          this.dispatchEvent(new CustomEvent<DiscoveryEntitySelectedDetail>(
            "discovery-entity-selected",
            { detail:{ entityId }, bubbles:true, composed:true }
          ));
        }}></ha-entity-picker>
    `;
  }
}

if (!customElements.get("discovery-entity-picker")) {
  customElements.define("discovery-entity-picker", DiscoveryEntityPicker);
}
