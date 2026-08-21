import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import { getCircuitDiscoveryCandidates } from "../../discovery/discovery-consumers.ts";
import type { DiscoveredMetric } from "../../discovery/discovery.types";
import type { CircuitConfigInput } from "../../types/circuit";
import type { DiscoveryEntitySelectedDetail } from "../shared/discovery-entity-picker.ts";
import { moveItem, removeItem } from "../shared/item-list-operations.ts";
import "../shared/discovery-entity-picker.ts";
import "./circuit-item-editor.ts";

export class CircuitManagerEditor extends LitElement {
  static properties = {
    hass:{ attribute:false }, circuits:{ attribute:false },
    metrics:{ attribute:false }, selectedId:{ state:true },
  };
  hass?:HomeAssistant;
  circuits:readonly CircuitConfigInput[] = [];
  metrics:readonly DiscoveredMetric[] = [];
  private selectedId = "";

  static styles = css`
    :host {
      display: grid;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      gap: 12px;
    }

    :host > * {
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .circuit-row {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .circuit-select {
      min-width: 0;
      flex: 1 1 180px;
      overflow-wrap: anywhere;
    }
  `;

  private emit(circuits:readonly CircuitConfigInput[]) {
    this.dispatchEvent(new CustomEvent("circuit-list-changed", {
      detail:{ circuits:circuits.map((circuit, order) => ({ ...circuit, order })) },
      bubbles:true,
      composed:true,
    }));
  }

  private addCircuit(entity:string) {
    if (!entity || this.circuits.some((circuit) => circuit.entity === entity)) return;
    const metric = this.metrics.find((candidate) => candidate.entityId === entity);
    const base = entity.split(".").pop()?.replace(/[^a-z0-9_-]+/gi, "-") || "circuit";
    let id = `circuit-${base}`;
    let suffix = 2;
    while (this.circuits.some((circuit) => circuit.id === id)) {
      id = `circuit-${base}-${suffix++}`;
    }
    this.emit([...this.circuits, {
      id,
      entity,
      name:metric?.name ?? entity,
      icon:"mdi:electric-switch",
      enabled:true,
      order:this.circuits.length,
    }]);
    this.selectedId = id;
  }

  render() {
    const selected = this.circuits.find((circuit) => circuit.id === this.selectedId);
    const candidates = getCircuitDiscoveryCandidates(
      this.metrics,
      selected?.entity
    );
    const configured = new Set(this.circuits.map((circuit) => circuit.entity));
    return html`
      <discovery-entity-picker label="Add circuit" .hass=${this.hass}
        .value=${""}
        .candidates=${getCircuitDiscoveryCandidates(this.metrics)
          .filter((candidate) => !configured.has(candidate.entityId))}
        @discovery-entity-selected=${(event:CustomEvent<DiscoveryEntitySelectedDetail>) =>
          this.addCircuit(event.detail.entityId)}>
      </discovery-entity-picker>
      ${this.circuits.map((circuit, index) => html`
        <div class="circuit-row">
          <button class="circuit-select" type="button" @click=${() => { this.selectedId = circuit.id; }}>
            ${circuit.name || circuit.entity}${circuit.enabled === false ? " (hidden)" : ""}
          </button>
          <ha-button appearance="plain" ?disabled=${index === 0}
            @click=${() => {
              if (!index) return;
              this.emit(moveItem(this.circuits, index, -1));
            }}>Up</ha-button>
          <ha-button appearance="plain" ?disabled=${index === this.circuits.length - 1}
            @click=${() => {
              if (index >= this.circuits.length - 1) return;
              this.emit(moveItem(this.circuits, index, 1));
            }}>Down</ha-button>
          <ha-button appearance="plain" @click=${() => {
            this.emit(removeItem(
              this.circuits,
              (candidate) => candidate.id === circuit.id
            ));
            if (this.selectedId === circuit.id) this.selectedId = "";
          }}>Remove</ha-button>
        </div>
      `)}
      ${selected ? html`
        <circuit-item-editor .hass=${this.hass} .item=${selected}
          .candidates=${candidates}
          @circuit-item-changed=${(event:CustomEvent<{item:CircuitConfigInput}>) => {
            event.stopPropagation();
            this.emit(this.circuits.map((circuit) =>
              circuit.id === selected.id ? event.detail.item : circuit
            ));
          }}></circuit-item-editor>
      ` : null}
    `;
  }
}

if (!customElements.get("circuit-manager")) {
  customElements.define("circuit-manager", CircuitManagerEditor);
}
