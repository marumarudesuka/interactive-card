import { LitElement, css, html } from "lit";

export interface InfoPanelItem { label:string; value:string; }

export class IcInfoPanel extends LitElement {
  static properties = { items:{ attribute:false } };
  items: InfoPanelItem[] = [];

  static styles = css`
    :host { display:block; }
    .panel {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
      gap:12px;
      padding:12px;
      border:var(--ic-border-control,var(--en-border));
      border-radius:var(--en-panel-radius,18px);
      background:var(--ic-control-background,var(--en-surface-control));
    }
    .item { display:grid; min-width:0; gap:4px; }
    span { color:var(--en-text-secondary,var(--secondary-text-color)); font-size:13px; font-weight:400; line-height:1.4; }
    strong { overflow:hidden; color:var(--en-text-primary,var(--primary-text-color)); font-size:14px; font-weight:600; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; }
    @media(max-width:520px) { .panel { grid-template-columns:1fr; } }
  `;

  render() {
    return html`<div class="panel">${this.items.map((item) => html`
      <div class="item"><span>${item.label}</span><strong>${item.value || "--"}</strong></div>
    `)}</div>`;
  }
}

customElements.define("ic-info-panel", IcInfoPanel);
