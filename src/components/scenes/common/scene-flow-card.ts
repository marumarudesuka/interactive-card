import { LitElement, css, html } from "lit";
import "../../common/glass-container";

export interface SceneFlowNode {
  label: string;
  value?: string;
  icon: string;
}

export class SceneFlowCard extends LitElement {
  static properties = { title: { type:String }, nodes: { attribute:false } };
  title = "Energy Flow";
  nodes: SceneFlowNode[] = [];
  static styles = css`
    :host { display:block; }
    ic-glass-container { --glass-container-height:220px; }
    h3 {
      margin:0 0 24px;
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    .flow { display:flex; align-items:center; justify-content:center; gap:clamp(10px,3vw,30px); }
    .node { display:grid; min-width:70px; justify-items:center; gap:7px; text-align:center; }
    .node ha-icon { --mdc-icon-size:34px; color:var(--en-color-primary); }
    h3 { color:var(--en-heading-primary,var(--primary-text-color)); }
    .node span { color:var(--en-body-secondary,var(--secondary-text-color)); font-size:12px; }
    .arrow { opacity:.35; font-size:22px; }
  `;
  render() {
    return html`<ic-glass-container><h3>${this.title}</h3><div class="flow">
      ${this.nodes.map((node, index) => html`
        ${index ? html`<span class="arrow">→</span>` : null}
        <div class="node"><ha-icon .icon=${node.icon}></ha-icon><strong>${node.label}</strong><span>${node.value ?? ""}</span></div>
      `)}
    </div></ic-glass-container>`;
  }
}
customElements.define("ic-scene-flow-card", SceneFlowCard);
