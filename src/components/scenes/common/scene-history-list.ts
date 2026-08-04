import { LitElement, css, html } from "lit";
import type { SceneHistoryEntry } from "../../../types/scenes";
import "../../common/glass-container";

export class SceneHistoryList extends LitElement {
  static properties = {
    title: { type: String },
    headings: { attribute: false },
    entries: { attribute: false },
  };
  title = "History";
  headings: string[] = [];
  entries: SceneHistoryEntry[] = [];

  static styles = css`
    :host { display:block; min-width:0; }
    ic-glass-container { --glass-container-height:auto; }
    h3 {
      margin:0 0 16px;
      font-size:var(--en-title-md-size,18px);
      font-weight:var(--en-title-md-weight,600);
      line-height:var(--en-title-md-line-height,1.25);
      letter-spacing:var(--en-title-md-letter-spacing,-0.1px);
    }
    .row { display:grid; grid-template-columns:minmax(130px,1.4fr) repeat(var(--columns),minmax(70px,1fr)); gap:12px; padding:12px 0; border-bottom:1px solid var(--divider-color); }
    .row:last-child { border-bottom:0; }
    h3 { color:var(--en-heading-primary,var(--primary-text-color)); }
    .head { color:var(--en-body-secondary,var(--secondary-text-color)); font-size:11px; text-transform:uppercase; }
    .title { font-weight:600; }
    .subtitle { color:var(--en-subtitle-secondary,var(--secondary-text-color)); font-size:12px; }
    @media(max-width:600px) { .row { font-size:12px; overflow-x:auto; } }
  `;
  render() {
    const columns = Math.max(this.headings.length, 1);
    return html`<ic-glass-container><h3>${this.title}</h3>
      <div style=${`--columns:${columns}`}>
        ${this.headings.length ? html`<div class="row head"><span></span>${this.headings.map((h) => html`<span>${h}</span>`)}</div>` : null}
        ${this.entries.map((entry) => html`<div class="row">
          <div><div class="title">${entry.title}</div><div class="subtitle">${entry.subtitle ?? ""}</div></div>
          ${entry.values.map((value) => html`<span>${value}</span>`)}
        </div>`)}
      </div>
    </ic-glass-container>`;
  }
}
customElements.define("ic-scene-history-list", SceneHistoryList);
