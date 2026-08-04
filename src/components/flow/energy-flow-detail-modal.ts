import { LitElement, css, html } from "lit";
import { formatMetric } from "../../helpers/metric-formatter";
import type { EnergyFlowNode } from "../../types/energy-flow";
import { dialogContentStyle } from "../../design-system/dialog";
import "../common/app-dialog";

export class EnergyFlowDetailModal extends LitElement {
  static properties = {
    open: { type:Boolean },
    node: { attribute:false },
  };
  open = false;
  node?: EnergyFlowNode;
  private lastNode?: EnergyFlowNode;

  static styles = [css`
    :host { display:contents; }
    .body { display:grid; gap:16px; padding:18px; color:var(--primary-text-color); }
    .hero { display:flex; align-items:center; gap:12px; }
    .hero ha-icon { --mdc-icon-size:34px; color:var(--en-color-primary); }
    .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .metric { padding:12px; border:1px solid var(--divider-color); border-radius:var(--ic-radius-control); }
    .metric span { color:var(--secondary-text-color); font-size:11px; }
    .metric strong { display:block; margin-top:5px; }
  `, dialogContentStyle];

  private close() {
    this.dispatchEvent(new CustomEvent("energy-flow-detail-close", {
      bubbles:true,
      composed:true,
    }));
  }

  protected updated() {
    if (this.node) this.lastNode = this.node;
  }

  render() {
    const node = this.node ?? this.lastNode;
    if (!node) return null;
    const metric = formatMetric({
      entityId:node.id,
      name:node.name,
      status:"valid",
      value:node.power,
      unit:"W",
    }, { autoScale:true, decimals:2 });
    return html`<ic-app-dialog
      .open=${this.open}
      .title=${node.name}
      @dialog-close=${this.close}
    ><div class="body">
      <div class="hero"><ha-icon .icon=${node.icon}></ha-icon><strong>${node.name}</strong></div>
      <div class="metrics">
        <div class="metric"><span>Current Power</span><strong>${metric.value} ${metric.unit}</strong></div>
        <div class="metric"><span>Today Usage</span><strong>Not configured</strong></div>
        <div class="metric"><span>Trend</span><strong>Live</strong></div>
      </div>
    </div></ic-app-dialog>`;
  }
}
customElements.define("ic-energy-flow-detail-modal", EnergyFlowDetailModal);
