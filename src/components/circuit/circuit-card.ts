import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import type { ResolvedCircuit } from "../../types/circuit";
import "../common/ic-card-container";
import "../common/metric-value";

export interface CircuitSelectedDetail {
  circuit: ResolvedCircuit;
}

export class CircuitCard extends LitElement {
  static properties = {
    circuit: { attribute: false },
    hass: { attribute: false },
    selected: { type: Boolean, reflect: true },
  };

  circuit?: ResolvedCircuit;
  hass?: HomeAssistant;
  selected = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      height: 100%;
      color: var(--en-surface-text-primary, var(--primary-text-color));
    }

    ic-card-container {
      --energy-card-height: var(--circuit-card-height, 150px);
      --energy-card-padding:
        var(--circuit-card-padding-block,18px)
        var(--en-card-content-inset,18px);
      --ic-shadow-card: var(--circuit-card-shadow, 0 8px 18px rgba(0,0,0,.16));
      --ic-card-hover-transform: translateY(-1px);
      --ic-card-active-transform: translateY(-1px);
      cursor: pointer;
    }

    :host(:hover) ic-card-container {
      --ic-border-card: 1px solid color-mix(
        in srgb,
        var(--en-color-primary) 28%,
        transparent
      );
      --ic-shadow-card: inset 0 0 0 1px color-mix(
        in srgb,
        var(--en-color-primary) 18%,
        transparent
      ), 0 8px 18px rgba(0,0,0,.18);
    }

    :host([selected]) ic-card-container {
      --ic-border-card: 1px solid color-mix(
        in srgb,
        var(--en-color-primary) 55%,
        transparent
      );
      --ic-shadow-card:
        inset 0 0 0 1px color-mix(
          in srgb,
          var(--en-color-primary) 35%,
          transparent
        ),
        0 8px 18px rgba(0,0,0,.2);
    }

    ic-card-container:focus-visible {
      outline: var(--ic-focus-ring);
      outline-offset: 3px;
    }

    .circuit {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 64px;
      grid-template-areas:
        "information icon";
      column-gap: 14px;
      height: 100%;
      min-width: 0;
      align-items: center;
    }

    .information {
      grid-area: information;
      display: flex;
      min-width: 0;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }

    .identity {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 8px;
    }

    .status {
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--secondary-text-color);
      opacity: 0.55;
    }

    .status.active {
      background: var(--en-color-success);
      opacity: 1;
      box-shadow: 0 0 10px color-mix(
        in srgb,
        var(--en-color-success) 65%,
        transparent
      );
    }

    .status.warning {
      background: var(--en-color-accent);
      opacity: 1;
      box-shadow: 0 0 10px color-mix(
        in srgb,
        var(--en-color-accent) 60%,
        transparent
      );
    }

    .name {
      min-width: 0;
      overflow: hidden;
      color: var(--en-surface-text-primary, var(--en-heading-primary, var(--primary-text-color)));
      font-size: var(--en-title-md-size, 18px);
      font-weight: var(--en-title-md-weight, 600);
      line-height: var(--en-title-md-line-height, 1.25);
      letter-spacing: var(--en-title-md-letter-spacing, -0.1px);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    ic-metric-value {
      --metric-value-size: var(--circuit-value-size, 32px);
      --metric-value-letter-spacing: -1px;
      --metric-unit-size: var(--circuit-unit-size, 14px);
      --metric-value-color: var(--en-surface-text-primary, var(--primary-text-color));
      --metric-unit-color: var(--en-surface-text-secondary, var(--secondary-text-color));
    }

    .icon-area {
      grid-area: icon;
      display: grid;
      width: 64px;
      height: 64px;
      place-items: center;
      color: var(--en-surface-icon-primary, var(--primary-text-color));
      opacity: var(--circuit-icon-opacity, 0.48);
    }

    .icon-area.active {
      opacity: var(--circuit-active-icon-opacity, 0.62);
    }

    .icon {
      --mdc-icon-size: var(--circuit-icon-size, 46px);
    }
  `;

  private openSettings() {
    if (!this.circuit) return;
    console.debug("[ActiveCircuits] circuit clicked", this.circuit.config.id);
    this.dispatchEvent(new CustomEvent<CircuitSelectedDetail>("circuit-selected", {
      detail: { circuit: this.circuit },
      bubbles: true,
      composed: true,
    }));
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.openSettings();
  }

  render() {
    const circuit = this.circuit;
    if (!circuit) return null;
    const isUnavailable = circuit.stateStatus !== "valid";
    const visualStatus = isUnavailable
      ? "warning"
      : circuit.active
        ? "active"
        : "idle";

    return html`
      <ic-card-container
        role="button"
        tabindex="0"
        aria-label=${[
          circuit.config.name,
          circuit.value,
          circuit.unit,
        ].filter(Boolean).join(" ")}
        @click=${this.openSettings}
        @keydown=${this.handleKeydown}
      >
        <article class="circuit">
          <div class="information">
            <div class="identity">
              <span
                class="status ${visualStatus}"
                aria-hidden="true"
              ></span>
              <span class="name">${circuit.config.name}</span>
            </div>
            <ic-metric-value
              .value=${circuit.value}
              .unit=${circuit.unit}
              .status=${circuit.stateStatus}
            ></ic-metric-value>
          </div>
          <div
            class="icon-area ${visualStatus === "active" ? "active" : ""}"
          >
            <ha-icon
              class="icon"
              .icon=${circuit.config.icon ?? "mdi:electric-switch"}
              aria-hidden="true"
            ></ha-icon>
          </div>
        </article>
      </ic-card-container>
    `;
  }
}

customElements.define("ic-circuit-card", CircuitCard);
