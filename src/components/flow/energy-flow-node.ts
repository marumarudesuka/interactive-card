import { LitElement, css, html } from "lit";

import { formatMetric } from "../../helpers/metric-formatter";
import { getEnergyFlowColor } from "../../helpers/energy-flow-layout";
import type { EnergyFlowNode as EnergyFlowNodeModel } from "../../types/energy-flow";

export class EnergyFlowNodeElement extends LitElement {
  static properties = {
    node: { attribute: false },
  };

  node?: EnergyFlowNodeModel;

  static styles = css`
    :host {
      position: absolute;
      z-index: 10;
      display: block;
      transform: translate(-50%, -50%);
    }

    button {
      display: grid;
      width: var(--flow-node-size, 100px);
      height: var(--flow-node-size, 100px);
      padding: 12px;
      box-sizing: border-box;
      place-items: center;
      align-content: center;
      gap: 3px;
      border: var(--ic-card-border, 1px solid rgba(255,255,255,.18));
      border-radius: 50%;
      background: var(--ic-card-background, rgba(255,255,255,.08));
      box-shadow:
        var(--ic-card-shadow, 0 10px 40px rgba(0,0,0,.18)),
        0 0 25px color-mix(in srgb, var(--node-color) 22%, transparent);
      backdrop-filter: var(--ic-card-backdrop-filter, blur(25px));
      -webkit-backdrop-filter: var(--ic-card-backdrop-filter, blur(25px));
      color: var(--primary-text-color);
      cursor: pointer;
      transition: transform .2s ease;
    }

    button:hover { transform: scale(1.05); }
    button:focus-visible { outline:var(--ic-focus-ring); outline-offset:3px; }
    ha-icon { color:var(--node-color); --mdc-icon-size:25px; }
    .name { max-width:100%; overflow:hidden; color:var(--en-heading-primary,var(--primary-text-color)); font-size:12px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .power { font-size:13px; font-weight:750; }
    :host([node-type="home"]) { --flow-node-size:132px; }
    :host([node-type="home"]) ha-icon { --mdc-icon-size:34px; }
    :host([node-type="home"]) .power { font-size:17px; }
    :host([node-type="circuit"]) { --flow-node-size:78px; }
    :host([node-type="circuit"]) ha-icon { --mdc-icon-size:19px; }
    :host([node-type="circuit"]) .name { font-size:10px; }
    :host([node-type="circuit"]) .power { font-size:11px; }
  `;

  protected updated() {
    if (this.node) this.setAttribute("node-type", this.node.type);
  }

  private selectNode() {
    if (!this.node) return;
    this.dispatchEvent(new CustomEvent("energy-flow-node-selected", {
      detail: { node: this.node },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const node = this.node;
    if (!node) return null;
    const metric = formatMetric({
      entityId: node.id,
      name: node.name,
      status: "valid",
      value: node.power,
      unit: "W",
    }, {
      autoScale: true,
      decimals: Math.abs(node.power) < 1000 ? 0 : 2,
    });
    return html`<button
      type="button"
      style=${`--node-color:${getEnergyFlowColor(node.type)}`}
      aria-label=${`${node.name} ${metric.value} ${metric.unit}`}
      @click=${this.selectNode}
    >
      <span class="name">${node.name}</span>
      <ha-icon .icon=${node.icon}></ha-icon>
      <span class="power">${metric.value} ${metric.unit}</span>
    </button>`;
  }
}

customElements.define("ic-energy-flow-node", EnergyFlowNodeElement);
