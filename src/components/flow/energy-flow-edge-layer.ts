import { LitElement, css, svg } from "lit";
import type { EnergyFlowPath } from "../../types/energy-flow";

export class EnergyFlowEdgeLayer extends LitElement {
  static properties = {
    paths: { attribute: false },
    width: { type: Number },
    height: { type: Number },
  };
  paths: EnergyFlowPath[] = [];
  width = 1;
  height = 1;

  static styles = css`
    :host { position:absolute; inset:0; z-index:1; display:block; pointer-events:none; }
    svg { width:100%; height:100%; overflow:visible; }
    .base { opacity:.18; }
    .flow { opacity:.58; }
    .particle { filter:drop-shadow(0 0 4px currentColor); }
  `;

  render() {
    return svg`<svg viewBox=${`0 0 ${this.width} ${this.height}`} preserveAspectRatio="none">
      ${this.paths.map((item) => svg`
        <path class="base" d=${item.path} fill="none" stroke=${item.color} stroke-width=${item.width + 3} stroke-linecap="round"></path>
        <path class="flow" d=${item.path} fill="none" stroke=${item.color} stroke-width=${item.width} stroke-linecap="round"></path>
        ${Math.abs(item.edge.power) > 0 ? svg`
          <circle class="particle" r=${Math.max(3, item.width / 1.8)} fill=${item.color}>
            <animateMotion
              dur=${`${item.duration}s`}
              repeatCount="indefinite"
              path=${item.path}
            ></animateMotion>
          </circle>` : null}
      `)}
    </svg>`;
  }
}
customElements.define("ic-energy-flow-edge-layer", EnergyFlowEdgeLayer);
