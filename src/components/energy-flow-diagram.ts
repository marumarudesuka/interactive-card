import { LitElement, css, html } from "lit";
import type { HomeAssistant } from "custom-card-helpers";

import { resolveCircuit, sortCircuitsByPower } from "../helpers/circuit-utils";
import { createEnergyFlowLayout } from "../helpers/energy-flow-layout";
import { resolveEnergyFlowPaths } from "../helpers/energy-flow-model";
import { LocalStorageCircuitConfigRepository } from "../repositories/local-storage-circuit-config-repository";
import type { CircuitConfig } from "../types/circuit";
import type {
  EnergyFlowConfig,
  EnergyFlowEdge,
  EnergyFlowNode,
} from "../types/energy-flow";
import "./common/glass-container";
import "./common/section-header";
import "./flow/energy-flow-detail-modal";
import "./flow/energy-flow-edge-layer";
import "./flow/energy-flow-node";

export class EnergyFlowDiagram extends LitElement {
  static properties = {
    config: { attribute:false },
  };

  config: EnergyFlowConfig = {
    title: "Energy Flow",
    nodes: [],
    edges: [],
    maxCircuits: 5,
  };

  private _hass?: HomeAssistant;
  private readonly circuitRepository =
    new LocalStorageCircuitConfigRepository();
  private circuits: CircuitConfig[] = [];
  private width = 900;
  private resizeObserver?: ResizeObserver;
  private selectedNode?: EnergyFlowNode;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this.circuits.length) void this.loadCircuits();
    this.requestUpdate();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  setConfig(config: EnergyFlowConfig) {
    if (!config || !Array.isArray(config.nodes) || !Array.isArray(config.edges)) {
      throw new Error("Energy Flow requires nodes and edges");
    }
    this.config = {
      ...config,
      title: config.title?.trim() || "Energy Flow",
      maxCircuits: Math.max(0, config.maxCircuits ?? 5),
    };
    if (config.circuits?.length) {
      this.circuits = config.circuits.map((circuit, index) => ({
        ...circuit,
        enabled: circuit.enabled ?? true,
        order: circuit.order ?? index,
      }));
    } else {
      void this.loadCircuits();
    }
  }

  getGridOptions() {
    return { columns:"full" };
  }

  static styles = css`
    :host {
      display:block;
      width:100%;
      min-width:0;
      color:var(--primary-text-color);
      container-type:inline-size;
    }

    ic-glass-container {
      display:block;
      width:100%;
      min-width:0;
      --glass-container-height:auto;
      --glass-container-padding:18px;
    }

    .flow {
      position:relative;
      width:100%;
      min-width:0;
      height:var(--flow-height,520px);
      overflow:visible;
    }

    .more {
      position:absolute;
      z-index:12;
      right:12px;
      bottom:10px;
      padding:7px 10px;
      border:1px solid var(--divider-color);
      border-radius:999px;
      background:var(--ic-card-background,rgba(255,255,255,.08));
      color:var(--secondary-text-color);
      backdrop-filter:var(--ic-card-backdrop-filter,blur(18px));
      font-size:12px;
      cursor:pointer;
    }

    @container (max-width:619px) {
      .flow { --flow-height:760px; }
    }
  `;

  protected firstUpdated() {
    const flow = this.renderRoot.querySelector<HTMLElement>(".flow");
    if (!flow) return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      if (nextWidth <= 0 || Math.abs(nextWidth - this.width) < 1) return;
      this.width = nextWidth;
      this.requestUpdate();
    });
    this.resizeObserver.observe(flow);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  private async loadCircuits() {
    const stored = await this.circuitRepository.load();
    this.circuits = stored ?? [];
    this.requestUpdate();
  }

  private createCircuitFlow(): {
    nodes: EnergyFlowNode[];
    edges: EnergyFlowEdge[];
    hiddenCount: number;
  } {
    const home = this.config.nodes.find((node) => node.type === "home");
    if (!home || !this._hass) return { nodes:[], edges:[], hiddenCount:0 };
    const resolved = sortCircuitsByPower(
      this.circuits
        .filter((circuit) => circuit.enabled)
        .map((circuit) => resolveCircuit(this._hass, circuit))
    );
    const maximum = this.config.maxCircuits ?? 5;
    const visible = resolved.slice(0, maximum);
    return {
      nodes: visible.map((circuit) => ({
        id: `circuit:${circuit.config.id}`,
        type: "circuit",
        name: circuit.config.name,
        icon: circuit.config.icon ?? "mdi:electric-switch",
        power: circuit.power ?? 0,
      })),
      edges: visible.map((circuit) => ({
        source: home.id,
        target: `circuit:${circuit.config.id}`,
        power: circuit.power ?? 0,
        direction: "forward",
      })),
      hiddenCount: Math.max(0, resolved.length - visible.length),
    };
  }

  private selectNode(event: CustomEvent<{ node: EnergyFlowNode }>) {
    this.selectedNode = event.detail.node;
    this.requestUpdate();
  }

  render() {
    const circuitFlow = this.createCircuitFlow();
    const nodes = [...this.config.nodes, ...circuitFlow.nodes];
    const edges = [...this.config.edges, ...circuitFlow.edges];
    const layout = createEnergyFlowLayout(nodes, this.width);
    const paths = resolveEnergyFlowPaths(nodes, edges, layout);

    return html`
      <ic-section-header .title=${this.config.title ?? "Energy Flow"}>
      </ic-section-header>
      <ic-glass-container>
        <div
          class="flow"
          style=${`--flow-height:${layout.height}px`}
          @energy-flow-node-selected=${this.selectNode}
        >
          <ic-energy-flow-edge-layer
            .paths=${paths}
            .width=${layout.width}
            .height=${layout.height}
          ></ic-energy-flow-edge-layer>
          ${nodes.map((node) => {
            const position = layout.positions.get(node.id);
            return position ? html`
              <ic-energy-flow-node
                style=${`left:${position.x}px;top:${position.y}px`}
                .node=${node}
              ></ic-energy-flow-node>` : null;
          })}
          ${circuitFlow.hiddenCount > 0 ? html`
            <button
              class="more"
              type="button"
              @click=${() => this.dispatchEvent(
                new CustomEvent("energy-flow-more-circuits", {
                  detail:{ count:circuitFlow.hiddenCount },
                  bubbles:true,
                  composed:true,
                })
              )}
            >+ ${circuitFlow.hiddenCount} more circuits</button>` : null}
        </div>
      </ic-glass-container>
      <ic-energy-flow-detail-modal
        .open=${Boolean(this.selectedNode)}
        .node=${this.selectedNode}
        @energy-flow-detail-close=${() => {
          this.selectedNode = undefined;
          this.requestUpdate();
        }}
      ></ic-energy-flow-detail-modal>
    `;
  }
}

customElements.define("energy-flow-diagram", EnergyFlowDiagram);
